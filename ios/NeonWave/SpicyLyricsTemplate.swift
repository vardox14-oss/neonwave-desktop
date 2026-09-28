// Auto-generated Spicy Lyrics HTML Template
import Foundation

enum SpicyLyricsTemplate {
    static let html: String = #"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  html, body {
    width: 100%;
    height: 100%;
    background: transparent !important;
    background-color: transparent !important;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display", "SF Pro", system-ui, sans-serif;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  ::-webkit-scrollbar { display: none; }

  :root {
    --DefaultLyricsSize: 26px;
    --lyrics-line-height: 1.35;
  }

  #lyricsContainer {
    padding-top: 110px;
    padding-bottom: 220px;
    padding-left: 18px;
    padding-right: 18px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-height: 100%;
    
    --ImageMask: linear-gradient(
      180deg,
      transparent 0px,
      transparent 20px,
      black 90px,
      black calc(100% - 90px),
      transparent calc(100% - 20px),
      transparent 100%
    );
    -webkit-mask-image: var(--ImageMask);
    mask-image: var(--ImageMask);
  }

  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    position: relative;
    cursor: pointer;
    font-size: var(--DefaultLyricsSize) !important;
    font-weight: 700 !important;
    line-height: var(--lyrics-line-height) !important;
    letter-spacing: -0.02em;
    margin: 14px 0 !important;
    padding: 6px 12px !important;
    transform-origin: left center !important;
    border-radius: 16px;
    will-change: transform, opacity, filter, scale;
    transition:
      scale 0.2s cubic-bezier(0.37, 0, 0.63, 1),
      opacity 0.2s cubic-bezier(0.61, 1, 0.88, 1),
      filter 0.25s cubic-bezier(0.37, 0, 0.63, 1) !important;
  }

  .line:not(.musical-line)::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    transform: translateY(-50%) scale(0.92);
    width: 100%;
    height: calc(100% + 4px);
    background-color: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    opacity: 0;
    border-radius: 16px;
    transition: opacity 0.25s ease, scale 0.4s linear(0, 0.013 1%, 0.051 2.2%, 0.404 9.8%, 0.51 12.6%, 0.602 15.5%, 0.683 18.7%, 0.754 22.2%, 0.813 26%, 0.861 30.2%, 0.9 34.8%, 0.931 40%, 0.972 52.7%, 0.992 70.2%, 1);
    transform-origin: center center;
    pointer-events: none;
    z-index: -1;
  }
  .line:not(.musical-line):hover::before {
    opacity: 1;
    scale: 1.05;
  }

  .word {
    display: inline-flex;
    position: relative;
    background: none !important;
    background-image: none !important;
    -webkit-background-clip: unset !important;
    background-clip: unset !important;
    border: none !important;
    box-shadow: none !important;
    transform-origin: center center;
    will-change: transform, opacity, scale;
  }
  .word:not(:last-child)::after {
    content: "";
    margin-right: 0.32ch;
  }

  .letter {
    cursor: pointer;
    font-weight: 700 !important;
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    -webkit-background-clip: text !important;
    position: relative;
    display: inline-block;
    transform-origin: center center;
    will-change: transform, opacity, scale, text-shadow;
    background: none;

    --gradient-position: -20%;
    --gradient-color: 255;
    --gradient-alpha: 0.85;
    --gradient-alpha-end: 0.35;
    --gradient-degrees: 90deg;
    --gradient-offset: 0%;
    --text-shadow-blur-radius: 4px;
    --text-shadow-opacity: 0%;

    background-image: linear-gradient(
      var(--gradient-degrees),
      rgba(255, 255, 255, var(--gradient-alpha)) var(--gradient-position),
      rgba(255, 255, 255, var(--gradient-alpha-end)) calc(var(--gradient-position) + 20% + var(--gradient-offset))
    ) !important;
    text-shadow: 0 0 var(--text-shadow-blur-radius) rgba(255, 255, 255, var(--text-shadow-opacity));
  }

  .line.line-mode {
    cursor: pointer;
    font-weight: 700 !important;
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    -webkit-background-clip: text !important;
    background-image: linear-gradient(
      var(--gradient-degrees, 90deg),
      rgba(255, 255, 255, var(--gradient-alpha, 0.95)) var(--gradient-position, -20%),
      rgba(255, 255, 255, var(--gradient-alpha-end, 0.35)) calc(var(--gradient-position, -20%) + 20% + var(--gradient-offset, 0%))
    ) !important;
    text-shadow: 0 0 var(--text-shadow-blur-radius, 4px) rgba(255, 255, 255, var(--text-shadow-opacity, 0%));
  }

  .line.Active {
    opacity: 1 !important;
    scale: 1.05;
    filter: blur(0px) !important;
  }

  .line:not(.line-mode),
  .line .word {
    background: none !important;
    background-image: none !important;
    -webkit-background-clip: unset !important;
    background-clip: unset !important;
  }

  .line.NotSung {
    opacity: 0.51;
    scale: 0.95;
    filter: blur(var(--BlurAmount, 0px));
    --gradient-position: -20% !important;
    --text-shadow-blur-radius: 4px !important;
    --text-shadow-opacity: 0% !important;
  }
  .line.NotSung .letter {
    --gradient-position: -20% !important;
    --text-shadow-blur-radius: 4px !important;
    --text-shadow-opacity: 0% !important;
  }

  .line.Sung {
    opacity: 0.497;
    scale: 0.95;
    filter: blur(var(--BlurAmount, 0px));
    --gradient-position: 100% !important;
    --text-shadow-blur-radius: 4px !important;
    --text-shadow-opacity: 0% !important;
  }
  .line.Sung .letter {
    --gradient-position: 100% !important;
    --text-shadow-blur-radius: 4px !important;
    --text-shadow-opacity: 0% !important;
  }

  .line.musical-line {
    transition: transform 0.14s, opacity 0.14s !important;
    position: relative;
    transform-origin: center center !important;
    z-index: 1;
    opacity: 0;
    height: 0 !important;
    line-height: 0 !important;
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .line.musical-line.Active {
    opacity: 1;
    overflow: visible !important;
    height: auto !important;
    line-height: var(--lyrics-line-height) !important;
    margin: 14px 0 !important;
  }
  .line.musical-line .dotGroup {
    display: flex;
    flex-direction: row;
    gap: 12px;
    transform-origin: center center;
    transition: scale 0.3s !important;
    scale: 1;
  }
  .line.musical-line:is(.pre-hidden, :not(.Active)) .dotGroup {
    transition: scale 0.4s linear(0, -0.006 9.4%, -0.029 18%, -0.157 43.3%, -0.185 51.4%, -0.189 55.9%, -0.182 60%, -0.163 63.9%, -0.133 67.6%, -0.074 72.3%, 0.006 76.7%, 0.238 85%, 0.566 92.7%, 1) !important;
    scale: 0 !important;
  }

  .dot {
    font-size: 26px !important;
    font-weight: 700;
    display: inline-block;
    will-change: transform, opacity, scale, text-shadow;
    color: #ffffff;
    text-shadow: 0 0 var(--text-shadow-blur-radius, 4px) rgba(255, 255, 255, var(--text-shadow-opacity, 0%));
  }
</style>
</head>
<body>
  <div id="lyricsContainer"></div>

  <script>
    class Spring {
      constructor(startPosition, frequency, dampingRatio, goal) {
        this.d = dampingRatio;
        this.f = frequency;
        this.g = goal !== undefined ? goal : startPosition;
        this.p = startPosition;
        this.v = 0;
      }
      SetGoal(g, snap = false) {
        this.g = g;
        if (snap) { this.p = g; this.v = 0; }
      }
      Step(dt) {
        dt = Math.min(dt, 0.05);
        const d = this.d;
        const f = this.f * (2 * Math.PI);
        const g = this.g;
        let p = this.p;
        let v = this.v;
        if (d === 1) {
          const q = Math.exp(-f * dt);
          const w = dt * q;
          const c0 = q + w * f;
          const c2 = q - w * f;
          const c3 = w * f * f;
          const o = p - g;
          p = o * c0 + v * w + g;
          v = v * c2 - o * c3;
        } else if (d < 1) {
          const q = Math.exp(-d * f * dt);
          const c = Math.sqrt(1 - d * d);
          const i = Math.cos(dt * f * c);
          const j = Math.sin(dt * f * c);
          const z = c > 1e-5 ? (j / c) : dt * f;
          const y = (f * c > 1e-5) ? (j / (f * c)) : dt;
          const o = p - g;
          p = (o * (i + z * d) + v * y) * q + g;
          v = (v * (i - z * d) - o * (z * f)) * q;
        } else {
          const c = Math.sqrt(d * d - 1);
          const r1 = -f * (d + c);
          const r2 = -f * (d - c);
          const ec1 = Math.exp(r1 * dt);
          const ec2 = Math.exp(r2 * dt);
          const o = p - g;
          const co2 = (v - o * r1) / (2 * f * c);
          const co1 = ec1 * (o - co2);
          p = co1 + co2 * ec2 + g;
          v = co1 * r1 + co2 * ec2 * r2;
        }
        this.p = p;
        this.v = v;
        return p;
      }
    }

    class CubicSpline {
      constructor(points) {
        this.xs = points.map(p => p.Time);
        this.ys = points.map(p => p.Value);
        const n = this.xs.length;
        this.ks = new Float64Array(n);
        const A = Array.from({ length: n }, () => new Float64Array(n));
        const b = new Float64Array(n);
        A[0][0] = 1;
        A[n - 1][n - 1] = 1;
        for (let i = 1; i < n - 1; i++) {
          const h0 = this.xs[i] - this.xs[i - 1];
          const h1 = this.xs[i + 1] - this.xs[i];
          A[i][i - 1] = h0;
          A[i][i] = 2 * (h0 + h1);
          A[i][i + 1] = h1;
          b[i] = 3 * ((this.ys[i + 1] - this.ys[i]) / h1 - (this.ys[i] - this.ys[i - 1]) / h0);
        }
        for (let i = 1; i < n; i++) {
          const m = A[i][i - 1] / A[i - 1][i - 1];
          A[i][i] -= m * A[i - 1][i];
          b[i] -= m * b[i - 1];
        }
        this.ks[n - 1] = b[n - 1] / A[n - 1][n - 1];
        for (let i = n - 2; i >= 0; i--) {
          this.ks[i] = (b[i] - A[i][i + 1] * this.ks[i + 1]) / A[i][i];
        }
      }
      at(x) {
        let i = 1;
        const n = this.xs.length;
        if (x <= this.xs[0]) return this.ys[0];
        if (x >= this.xs[n - 1]) return this.ys[n - 1];
        while (i < n && this.xs[i] < x) i++;
        const t = (x - this.xs[i - 1]) / (this.xs[i] - this.xs[i - 1]);
        const a = this.ks[i - 1] * (this.xs[i] - this.xs[i - 1]) - (this.ys[i] - this.ys[i - 1]);
        const b = -this.ks[i] * (this.xs[i] - this.xs[i - 1]) + (this.ys[i] - this.ys[i - 1]);
        return (1 - t) * this.ys[i - 1] + t * this.ys[i] + t * (1 - t) * (a * (1 - t) + b * t);
      }
    }

    const LetterScaleRange = [{ Time: 0, Value: 0.95 }, { Time: 0.7, Value: 1.175 }, { Time: 1, Value: 1.0 }];
    const LetterYOffsetRange = [{ Time: 0, Value: 0.01 }, { Time: 0.9, Value: -0.018 }, { Time: 1, Value: 0.0 }];
    const GlowRange = [{ Time: 0, Value: 0.0 }, { Time: 0.15, Value: 1.0 }, { Time: 0.6, Value: 1.0 }, { Time: 1, Value: 0.0 }];
    const DotAnimations = {
      YOffsetDamping: 0.4, YOffsetFrequency: 1.25,
      ScaleDamping: 0.6, ScaleFrequency: 0.7,
      GlowDamping: 0.5, GlowFrequency: 1.0,
      OpacityDamping: 0.5, OpacityFrequency: 1.0,
      ScaleRange: [{ Time: 0, Value: 0.75 }, { Time: 0.7, Value: 1.05 }, { Time: 1, Value: 1.0 }],
      YOffsetRange: [{ Time: 0, Value: 0.0 }, { Time: 0.9, Value: -0.12 }, { Time: 1, Value: 0.0 }],
      GlowRange: [{ Time: 0, Value: 0.0 }, { Time: 0.6, Value: 1.0 }, { Time: 1, Value: 1.0 }],
      OpacityRange: [{ Time: 0, Value: 0.35 }, { Time: 0.6, Value: 1.0 }, { Time: 1, Value: 1.0 }]
    };
    const LineGlowRange = [{ Time: 0, Value: 0.0 }, { Time: 0.5, Value: 1.0 }, { Time: 1, Value: 0.0 }];

    const LetterScaleSpline = new CubicSpline(LetterScaleRange);
    const LetterYOffsetSpline = new CubicSpline(LetterYOffsetRange);
    const GlowSpline = new CubicSpline(GlowRange);
    const DotScaleSpline = new CubicSpline(DotAnimations.ScaleRange);
    const DotYOffsetSpline = new CubicSpline(DotAnimations.YOffsetRange);
    const DotGlowSpline = new CubicSpline(DotAnimations.GlowRange);
    const DotOpacitySpline = new CubicSpline(DotAnimations.OpacityRange);
    const LineGlowSpline = new CubicSpline(LineGlowRange);

    const ScaleFrequency = 0.88;
    const ScaleDamping = 0.64;
    const YOffsetFrequency = 1.45;
    const YOffsetDamping = 0.4;
    const GlowFrequency = 1.18;
    const GlowDamping = 0.56;
    const LetterGlowMultiplier_Opacity = 185;
    const preHiddenDotLineMs = 0.45;

    function easeSinOut(x) { return Math.sin((x * Math.PI) / 2); }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function getElementState(t, start, end) {
      if (t < start) return "NotSung";
      if (t >= end) return "Sung";
      return "Active";
    }
    function getProgressPercentage(t, start, end) {
      if (t <= start) return 0;
      if (t >= end) return 1;
      return (t - start) / (end - start);
    }

    let SONG_DATA = [];
    let currentLyricsType = 'Syllable'; // 'Syllable' | 'Line'
    let activeLineIndex = -1;
    let targetTime = 0;
    let currentTime = 0;
    let isPlaying = false;
    let lastAnimTimestamp = 0;
    const lyricsContainer = document.getElementById('lyricsContainer');

    function processLyricsLines(rawLines) {
      const processed = [];
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const nextTime = (i + 1 < rawLines.length) ? rawLines[i + 1].time : (line.time + 4.5);
        const lineDuration = Math.max(0.5, nextTime - line.time);
        const trimmed = (line.text || '').trim();

        const isExplicitDots = trimmed === '•••' || trimmed === '...' || trimmed === '♪' || (lineDuration >= 7.0 && trimmed.length < 3);
        if (isExplicitDots) {
          processed.push({
            StartTime: line.time,
            EndTime: nextTime,
            DotLine: true,
            Dots: [
              { Start: line.time, End: line.time + lineDuration / 3 },
              { Start: line.time + lineDuration / 3, End: line.time + (2 * lineDuration) / 3 },
              { Start: line.time + (2 * lineDuration) / 3, End: nextTime }
            ]
          });
          continue;
        }

        const words = trimmed.split(/\s+/).filter(w => w.length > 0);
        const totalWords = Math.max(1, words.length);
        
        let vocalDuration = lineDuration;
        let hasInterlude = false;
        if (lineDuration > 7.5 && totalWords <= 8) {
          vocalDuration = Math.min(lineDuration * 0.55, totalWords * 0.7);
          hasInterlude = true;
        }

        const wordWindow = vocalDuration / totalWords;
        const wordObjects = words.map((w, wIdx) => ({
          Text: w,
          Start: line.time + wIdx * wordWindow,
          End: line.time + (wIdx + 1) * wordWindow
        }));

        processed.push({
          StartTime: line.time,
          EndTime: line.time + vocalDuration,
          Text: trimmed,
          Words: wordObjects
        });

        if (hasInterlude) {
          const interludeStart = line.time + vocalDuration;
          const interludeEnd = nextTime;
          const interludeDuration = interludeEnd - interludeStart;
          processed.push({
            StartTime: interludeStart,
            EndTime: interludeEnd,
            DotLine: true,
            Dots: [
              { Start: interludeStart, End: interludeStart + interludeDuration / 3 },
              { Start: interludeStart + interludeDuration / 3, End: interludeStart + (2 * interludeDuration) / 3 },
              { Start: interludeStart + (2 * interludeDuration) / 3, End: interludeEnd }
            ]
          });
        }
      }
      return processed;
    }

    function buildLyricsDOM() {
      lyricsContainer.innerHTML = '';
      const isLineMode = (currentLyricsType === 'Line');

      SONG_DATA.forEach((lineData, lineIdx) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'line NotSung' + (lineData.DotLine ? ' musical-line' : '') + (isLineMode && !lineData.DotLine ? ' line-mode' : '');
        lineData.HTMLElement = lineEl;

        lineEl.onclick = () => {
          if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.neonwaveLyrics) {
            window.webkit.messageHandlers.neonwaveLyrics.postMessage({ type: 'seek', time: lineData.StartTime });
          }
        };

        if (lineData.DotLine) {
          const dotGroup = document.createElement('div');
          dotGroup.className = 'dotGroup';
          lineData.dotGroupEl = dotGroup;

          lineData.Dots.forEach((dotData) => {
            const dotEl = document.createElement('span');
            dotEl.className = 'dot';
            dotEl.textContent = '•';
            dotData.HTMLElement = dotEl;
            dotData.AnimatorStore = {
              Scale: new Spring(DotScaleSpline.at(0), DotAnimations.ScaleFrequency, DotAnimations.ScaleDamping),
              YOffset: new Spring(DotYOffsetSpline.at(0), DotAnimations.YOffsetFrequency, DotAnimations.YOffsetDamping),
              Glow: new Spring(DotGlowSpline.at(0), DotAnimations.GlowFrequency, DotAnimations.GlowDamping),
              Opacity: new Spring(DotOpacitySpline.at(0), DotAnimations.OpacityFrequency, DotAnimations.OpacityDamping)
            };
            dotGroup.appendChild(dotEl);
          });
          lineEl.appendChild(dotGroup);
        } else if (isLineMode) {
          lineEl.textContent = lineData.Words ? lineData.Words.map(w => w.Text).join(' ') : (lineData.Text || '');
          lineData.AnimatorStore = {
            Glow: new Spring(LineGlowSpline.at(0), 1.0, 0.5)
          };
        } else {
          lineData.AnimatorStore = {
            Glow: new Spring(LineGlowSpline.at(0), 1.0, 0.5)
          };

          if (lineData.Words) {
            lineData.Words.forEach((wordData) => {
              const wordEl = document.createElement('span');
              wordEl.className = 'word';
              wordData.HTMLElement = wordEl;
              wordData.Letters = [];

              const chars = wordData.Text.split('');
              const wordDuration = Math.max(0.01, wordData.End - wordData.Start);
              const letterDuration = wordDuration / chars.length;

              chars.forEach((ch, chIdx) => {
                const letterEl = document.createElement('span');
                letterEl.className = 'letter';
                letterEl.textContent = ch;

                const letterStart = wordData.Start + chIdx * letterDuration;
                const letterEnd = letterStart + letterDuration;

                const letterData = {
                  Char: ch,
                  StartTime: letterStart,
                  EndTime: letterEnd,
                  HTMLElement: letterEl,
                  AnimatorStore: {
                    Scale: new Spring(LetterScaleSpline.at(0), ScaleFrequency, ScaleDamping),
                    YOffset: new Spring(LetterYOffsetSpline.at(0), YOffsetFrequency, YOffsetDamping),
                    Glow: new Spring(GlowSpline.at(0), GlowFrequency, GlowDamping)
                  }
                };
                wordData.Letters.push(letterData);
                wordEl.appendChild(letterEl);
              });
              lineEl.appendChild(wordEl);
            });
          }
        }
        lyricsContainer.appendChild(lineEl);
      });
    }

    window.setLyricsData = function(rawLines, mode) {
      currentLyricsType = (mode === 'Line') ? 'Line' : 'Syllable';
      activeLineIndex = -1;
      SONG_DATA = processLyricsLines(rawLines || []);
      buildLyricsDOM();
    };

    window.syncPlayback = function(time, playing) {
      targetTime = Math.max(0, time);
      isPlaying = playing;
      const drift = Math.abs(targetTime - currentTime);
      if (drift > 0.6) {
        currentTime = targetTime;
      }
    };

    function animateFrame(timestamp) {
      if (!lastAnimTimestamp) lastAnimTimestamp = timestamp;
      const dt = (timestamp - lastAnimTimestamp) / 1000;
      lastAnimTimestamp = timestamp;

      if (isPlaying) {
        const drift = targetTime - currentTime;
        if (Math.abs(drift) > 0.5) {
          currentTime = targetTime;
        } else {
          currentTime += dt + drift * 0.15;
        }
      } else {
        currentTime = targetTime;
      }

      let foundLine = -1;
      for (let i = 0; i < SONG_DATA.length; i++) {
        if (currentTime >= SONG_DATA[i].StartTime && currentTime < SONG_DATA[i].EndTime) {
          foundLine = i;
          break;
        }
      }

      if (foundLine !== activeLineIndex) {
        activeLineIndex = foundLine;

        SONG_DATA.forEach((line, idx) => {
          const isAct = (idx === activeLineIndex);
          const isPast = (idx < activeLineIndex);
          const isNot = (idx > activeLineIndex);

          line.HTMLElement.classList.toggle('Active', isAct);
          line.HTMLElement.classList.toggle('Sung', isPast);
          line.HTMLElement.classList.toggle('NotSung', isNot);

          const distance = Math.abs(idx - activeLineIndex);
          const blur = (isAct || distance === 0) ? '0px' : `${Math.min(distance * 2.2, 10).toFixed(1)}px`;
          line.HTMLElement.style.setProperty('--BlurAmount', blur);

          if (currentLyricsType === 'Line' && !line.DotLine) {
            if (isPast) {
              line.HTMLElement.style.setProperty('--gradient-position', '100%');
            } else if (isNot) {
              line.HTMLElement.style.setProperty('--gradient-position', '-20%');
            }
          }
        });

        if (activeLineIndex >= 0 && SONG_DATA[activeLineIndex].HTMLElement) {
          SONG_DATA[activeLineIndex].HTMLElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }

      // 1. Instrumental 3 dots
      SONG_DATA.forEach((line) => {
        if (!line.DotLine) return;
        if (currentTime > line.EndTime - preHiddenDotLineMs) {
          line.HTMLElement.classList.add('pre-hidden');
        } else {
          line.HTMLElement.classList.remove('pre-hidden');
        }

        line.Dots.forEach((dot) => {
          const dotState = getElementState(currentTime, dot.Start, dot.End);
          const dotPercent = getProgressPercentage(currentTime, dot.Start, dot.End);
          let targetScale, targetYOffset, targetGlow, targetOpacity;

          if (dotState === "Active") {
            targetScale = DotScaleSpline.at(dotPercent);
            targetYOffset = DotYOffsetSpline.at(dotPercent);
            targetGlow = DotGlowSpline.at(dotPercent);
            targetOpacity = DotOpacitySpline.at(dotPercent);
          } else if (dotState === "NotSung") {
            targetScale = DotScaleSpline.at(0);
            targetYOffset = DotYOffsetSpline.at(0);
            targetGlow = DotGlowSpline.at(0);
            targetOpacity = DotOpacitySpline.at(0);
          } else {
            targetScale = DotScaleSpline.at(1);
            targetYOffset = DotYOffsetSpline.at(1);
            targetGlow = DotGlowSpline.at(1);
            targetOpacity = DotOpacitySpline.at(1);
          }

          dot.AnimatorStore.Scale.SetGoal(targetScale);
          dot.AnimatorStore.YOffset.SetGoal(targetYOffset);
          dot.AnimatorStore.Glow.SetGoal(targetGlow);
          dot.AnimatorStore.Opacity.SetGoal(targetOpacity);

          const curScale = dot.AnimatorStore.Scale.Step(dt);
          const curYOffset = dot.AnimatorStore.YOffset.Step(dt);
          const curGlow = dot.AnimatorStore.Glow.Step(dt);
          const curOpacity = dot.AnimatorStore.Opacity.Step(dt);

          dot.HTMLElement.style.transform = `translate3d(0, calc(var(--DefaultLyricsSize) * ${curYOffset}), 0)`;
          dot.HTMLElement.style.scale = `${curScale}`;
          dot.HTMLElement.style.opacity = `${curOpacity}`;
          dot.HTMLElement.style.setProperty('--text-shadow-blur-radius', `${4 + 6 * curGlow}px`);
          dot.HTMLElement.style.setProperty('--text-shadow-opacity', `${curGlow * 90}%`);
        });
      });

      // 2. Active line animation
      if (activeLineIndex >= 0 && !SONG_DATA[activeLineIndex].DotLine) {
        const activeLine = SONG_DATA[activeLineIndex];
        const linePercent = getProgressPercentage(currentTime, activeLine.StartTime, activeLine.EndTime);

        // Syllable Mode
        if (currentLyricsType === 'Syllable' && activeLine.Words) {
          activeLine.HTMLElement.style.removeProperty('--gradient-position');

          activeLine.Words.forEach((word) => {
            const wordState = getElementState(currentTime, word.Start, word.End);

            if (wordState === "Active") {
              let activeLetterIdx = -1;
              let activeLetterPercent = 0;

              for (let i = 0; i < word.Letters.length; i++) {
                if (getElementState(currentTime, word.Letters[i].StartTime, word.Letters[i].EndTime) === "Active") {
                  activeLetterIdx = i;
                  activeLetterPercent = getProgressPercentage(currentTime, word.Letters[i].StartTime, word.Letters[i].EndTime);
                  break;
                }
              }

              const baseScale = LetterScaleSpline.at(activeLetterPercent);
              const baseYOffset = LetterYOffsetSpline.at(activeLetterPercent);
              const baseGlow = GlowSpline.at(activeLetterPercent);

              const restingScale = LetterScaleSpline.at(0);
              const restingYOffset = LetterYOffsetSpline.at(0);
              const restingGlow = GlowSpline.at(0);

              word.Letters.forEach((letter, k) => {
                const letterState = getElementState(currentTime, letter.StartTime, letter.EndTime);
                let targetScale, targetYOffset, targetGlow, targetGrad;

                if (activeLetterIdx !== -1) {
                  const distance = Math.abs(k - activeLetterIdx);
                  const falloff = Math.max(0, 1 / (1 + Math.pow(distance, 2.8)));
                  const glowFalloff = Math.max(0, 1 / (1 + distance * 0.9));

                  targetScale = restingScale + (baseScale - restingScale) * falloff;
                  targetYOffset = restingYOffset + (baseYOffset - restingYOffset) * falloff;
                  targetGlow = restingGlow + (baseGlow - restingGlow) * glowFalloff;
                } else {
                  targetScale = restingScale;
                  targetYOffset = restingYOffset;
                  targetGlow = restingGlow;
                }

                if (letterState === "NotSung") {
                  targetGrad = -20;
                } else if (letterState === "Sung") {
                  targetGrad = 100;
                } else {
                  targetGrad = (k === activeLetterIdx) ? (-20 + 120 * easeSinOut(activeLetterPercent)) : -20;
                }

                letter.AnimatorStore.Scale.SetGoal(targetScale);
                letter.AnimatorStore.YOffset.SetGoal(targetYOffset);
                letter.AnimatorStore.Glow.SetGoal(targetGlow);

                const curScale = letter.AnimatorStore.Scale.Step(dt);
                const curYOffset = letter.AnimatorStore.YOffset.Step(dt);
                const curGlow = letter.AnimatorStore.Glow.Step(dt);

                letter.HTMLElement.style.setProperty('--gradient-position', `${targetGrad}%`);
                letter.HTMLElement.style.transform = `translate3d(0, calc(var(--DefaultLyricsSize) * ${curYOffset * 2}), 0)`;
                letter.HTMLElement.style.scale = `${curScale}`;
                letter.HTMLElement.style.setProperty('--text-shadow-blur-radius', `${4 + 12 * curGlow}px`);
                letter.HTMLElement.style.setProperty('--text-shadow-opacity', `${curGlow * LetterGlowMultiplier_Opacity}%`);
              });
            } else if (wordState === "NotSung") {
              word.Letters.forEach((letter) => {
                letter.AnimatorStore.Scale.SetGoal(LetterScaleSpline.at(0));
                letter.AnimatorStore.YOffset.SetGoal(LetterYOffsetSpline.at(0));
                letter.AnimatorStore.Glow.SetGoal(GlowSpline.at(0));

                const curScale = letter.AnimatorStore.Scale.Step(dt);
                const curYOffset = letter.AnimatorStore.YOffset.Step(dt);
                const curGlow = letter.AnimatorStore.Glow.Step(dt);

                letter.HTMLElement.style.setProperty('--gradient-position', `-20%`);
                letter.HTMLElement.style.transform = `translate3d(0, calc(var(--DefaultLyricsSize) * ${curYOffset * 2}), 0)`;
                letter.HTMLElement.style.scale = `${curScale}`;
                letter.HTMLElement.style.setProperty('--text-shadow-blur-radius', `4px`);
                letter.HTMLElement.style.setProperty('--text-shadow-opacity', `0%`);
              });
            } else {
              word.Letters.forEach((letter) => {
                letter.AnimatorStore.Scale.SetGoal(LetterScaleSpline.at(1));
                letter.AnimatorStore.YOffset.SetGoal(LetterYOffsetSpline.at(1));
                letter.AnimatorStore.Glow.SetGoal(GlowSpline.at(1));

                const curScale = letter.AnimatorStore.Scale.Step(dt);
                const curYOffset = letter.AnimatorStore.YOffset.Step(dt);

                letter.HTMLElement.style.setProperty('--gradient-position', `100%`);
                letter.HTMLElement.style.transform = `translate3d(0, calc(var(--DefaultLyricsSize) * ${curYOffset * 2}), 0)`;
                letter.HTMLElement.style.scale = `${curScale}`;
                letter.HTMLElement.style.setProperty('--text-shadow-blur-radius', `4px`);
                letter.HTMLElement.style.setProperty('--text-shadow-opacity', `0%`);
              });
            }
          });
        }
        // Line Mode
        else if (currentLyricsType === 'Line') {
          const targetGradientPos = -20 + 120 * linePercent;
          const targetGlow = LineGlowSpline.at(linePercent);

          activeLine.AnimatorStore.Glow.SetGoal(targetGlow);
          const curGlow = activeLine.AnimatorStore.Glow.Step(dt);

          activeLine.HTMLElement.style.setProperty('--gradient-position', `${targetGradientPos.toFixed(1)}%`);
          activeLine.HTMLElement.style.setProperty('--text-shadow-blur-radius', `${4 + 8 * curGlow}px`);
          activeLine.HTMLElement.style.setProperty('--text-shadow-opacity', `${curGlow * 50}%`);
        }
      }

      requestAnimationFrame(animateFrame);
    }

    requestAnimationFrame(animateFrame);

    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.neonwaveLyrics) {
      window.webkit.messageHandlers.neonwaveLyrics.postMessage({ type: 'ready' });
    }
  </script>
</body>
</html>

"""#
}
