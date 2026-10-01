import SwiftUI
import WebKit

@MainActor
final class YouTubePlayer: NSObject, ObservableObject, WKScriptMessageHandler, WKNavigationDelegate {
    static let shared = YouTubePlayer()

    @Published var isPlaying = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var isReady = false
    @Published var currentVideoId: String?

    var onTimeUpdate: ((Double, Double) -> Void)?
    var onStateChange: ((Bool) -> Void)?
    var onEnded: (() -> Void)?
    var onError: ((Int) -> Void)?

    private var backingWebView: WKWebView?
    var webView: WKWebView {
        if backingWebView == nil { setupWebView() }
        return backingWebView!
    }
    private var pendingVideoId: String?

    override init() {
        super.init()
    }

    private func setupWebView() {
        guard backingWebView == nil else { return }
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsAirPlayForMediaPlayback = true
        config.suppressesIncrementalRendering = false
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        let controller = WKUserContentController()
        controller.add(self, name: "neonwaveBridge")
        config.userContentController = controller

        let wv = WKWebView(frame: .init(x: 0, y: 0, width: 200, height: 200), configuration: config)
        wv.isOpaque = false
        wv.backgroundColor = .clear
        wv.scrollView.backgroundColor = .clear
        wv.scrollView.isScrollEnabled = false
        wv.navigationDelegate = self
        wv.alpha = 0.01
        wv.isUserInteractionEnabled = false
        wv.accessibilityElementsHidden = true
        self.backingWebView = wv
        loadHTML()
    }

    /// Keeps the player in the app window itself. Inside the SwiftUI tree it was detached
    /// as soon as the full-screen player opened, and a detached WKWebView plays nothing.
    func attachToWindow() {
        let wv = webView
        guard wv.window == nil,
              let window = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .flatMap(\.windows)
                .first(where: \.isKeyWindow) else { return }
        wv.frame = CGRect(x: 0, y: 0, width: 200, height: 200)
        window.insertSubview(wv, at: 0)
    }

    // Temporary diagnostics: the request shows up in the server log (404 is expected).
    private func report(_ event: String) {
        guard let base = AppConfiguration.apiURL,
              var components = URLComponents(url: base.appendingPathComponent("api/ios/player-event"), resolvingAgainstBaseURL: false) else { return }
        components.queryItems = [
            URLQueryItem(name: "e", value: event),
            URLQueryItem(name: "v", value: currentVideoId ?? ""),
            URLQueryItem(name: "win", value: backingWebView?.window == nil ? "0" : "1")
        ]
        if let url = components.url { URLSession.shared.dataTask(with: url).resume() }
    }

    // YouTube rejects embeds whose host page claims to be youtube.com itself (error 152 on
    // every video), so the player page is served from the NeonWave server's origin instead.
    private static var embedOrigin: String {
        guard let api = AppConfiguration.apiURL, let scheme = api.scheme, let host = api.host else {
            return "https://neonwave.app"
        }
        return api.port.map { "\(scheme)://\(host):\($0)" } ?? "\(scheme)://\(host)"
    }

    func loadHTML() {
        let origin = Self.embedOrigin
        let html = """
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <script>
        window.onerror = function(msg) {
            window.webkit.messageHandlers.neonwaveBridge.postMessage({ type: 'jserror', msg: String(msg).slice(0, 120) });
        };
        </script>
        <script src="https://www.youtube.com/iframe_api"></script>
        <style>
        * { margin:0; padding:0; background:transparent; overflow:hidden; }
        html, body, #player { width:100%; height:100%; background:transparent; }
        </style>
        </head>
        <body>
        <div id="player"></div>
        <script>
        var player;
        var progressTimer;
        var lastPlayRequestTime = 0;
        var userRequestedPause = false;
        function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
                width: '100%',
                height: '100%',
                playerVars: {
                    'playsinline': 1,
                    'autoplay': 1,
                    'controls': 0,
                    'disablekb': 1,
                    'fs': 0,
                    'modestbranding': 1,
                    'rel': 0,
                    'origin': '\(origin)'
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': onPlayerError
                }
            });
        }
        function onPlayerReady(event) {
            window.webkit.messageHandlers.neonwaveBridge.postMessage({ type: 'ready' });
            if (progressTimer) clearInterval(progressTimer);
            progressTimer = setInterval(function() {
                if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
                    window.webkit.messageHandlers.neonwaveBridge.postMessage({
                        type: 'time',
                        current: player.getCurrentTime() || 0,
                        duration: player.getDuration() || 0
                    });
                }
            }, 250);
        }
        function onPlayerStateChange(event) {
            // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
            window.webkit.messageHandlers.neonwaveBridge.postMessage({
                type: 'state',
                state: event.data
            });
            // If the video pauses right after starting without user input (common on Topic tracks and WebKit autoplay policy), auto-resume
            if (event.data === 2 && !userRequestedPause && (Date.now() - lastPlayRequestTime) < 2500) {
                setTimeout(function() {
                    try {
                        if (player && !userRequestedPause) {
                            if (player.unMute) player.unMute();
                            if (player.setVolume) player.setVolume(100);
                            if (player.playVideo) player.playVideo();
                        }
                    } catch(e) {}
                }, 120);
            }
        }
        function onPlayerError(event) {
            window.webkit.messageHandlers.neonwaveBridge.postMessage({
                type: 'error',
                code: event.data
            });
        }
        function playVideoId(id) {
            lastPlayRequestTime = Date.now();
            userRequestedPause = false;
            if (player) {
                try {
                    if (player.unMute) player.unMute();
                    if (player.setVolume) player.setVolume(100);
                    if (typeof player.loadVideoById === 'function') {
                        player.loadVideoById(id, 0);
                    } else if (typeof player.cueVideoById === 'function') {
                        player.cueVideoById(id, 0);
                    }
                    if (player.playVideo) player.playVideo();
                } catch(e) {}
                setTimeout(function() {
                    try {
                        if (player && player.unMute) player.unMute();
                        if (player && player.setVolume) player.setVolume(100);
                        if (player && player.playVideo && !userRequestedPause) player.playVideo();
                    } catch(e) {}
                }, 300);
            } else {
                setTimeout(function() { playVideoId(id); }, 150);
            }
        }
        function resume() {
            userRequestedPause = false;
            lastPlayRequestTime = Date.now();
            if (player && player.unMute) player.unMute();
            if (player && player.setVolume) player.setVolume(100);
            if (player && player.playVideo) player.playVideo();
        }
        function pause() {
            userRequestedPause = true;
            if (player && player.pauseVideo) player.pauseVideo();
        }
        function seek(sec) { if (player && player.seekTo) player.seekTo(sec, true); }
        </script>
        </body>
        </html>
        """
        webView.loadHTMLString(html, baseURL: URL(string: origin))
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        if type != "time" { report("\(type):\(body["state"] ?? body["code"] ?? body["msg"] ?? "")") }
        switch type {
        case "ready":
            isReady = true
            if let pending = pendingVideoId {
                playVideo(pending)
                pendingVideoId = nil
            }
        case "time":
            let cur = (body["current"] as? Double) ?? 0
            let dur = (body["duration"] as? Double) ?? 0
            self.currentTime = cur
            if dur > 0 { self.duration = dur }
            onTimeUpdate?(cur, dur)
        case "state":
            let state = (body["state"] as? Int) ?? -1
            if state == 1 { // PLAYING
                isPlaying = true
                onStateChange?(true)
            } else if state == 2 { // PAUSED
                isPlaying = false
                onStateChange?(false)
            } else if state == 0 { // ENDED
                isPlaying = false
                onStateChange?(false)
                onEnded?()
            }
        case "error":
            let code = (body["code"] as? Int) ?? -1
            onError?(code)
        default:
            break
        }
    }

    func playVideo(_ videoId: String) {
        currentVideoId = videoId
        attachToWindow()
        report("play:ready=\(isReady)")
        guard isReady else {
            pendingVideoId = videoId
            return
        }
        webView.evaluateJavaScript("playVideoId('\(videoId)');")
    }

    func resume() {
        attachToWindow()
        webView.evaluateJavaScript("resume();")
    }

    func pause() {
        isPlaying = false
        backingWebView?.evaluateJavaScript("pause();")
    }

    func seek(to seconds: Double) {
        currentTime = seconds
        backingWebView?.evaluateJavaScript("seek(\(seconds));")
    }

    func stop() {
        pause()
        currentVideoId = nil
        currentTime = 0
        duration = 0
    }
}

/// Warms the player up at launch; the web view itself lives in the window (see attachToWindow).
struct YouTubePlayerWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        DispatchQueue.main.async { YouTubePlayer.shared.attachToWindow() }
        return UIView(frame: .zero)
    }
    func updateUIView(_ uiView: UIView, context: Context) {}
}
