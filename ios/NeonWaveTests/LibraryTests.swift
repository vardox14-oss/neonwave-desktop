import XCTest
@testable import NeonWave

final class LibraryTests: XCTestCase {
    func testDeviceAudioSelectsNativeAACAndRejectsWrongVideo() throws {
        let data = Data(#"{"playabilityStatus":{"status":"OK"},"videoDetails":{"videoId":"9Et9XGVMmUw"},"streamingData":{"adaptiveFormats":[{"itag":251,"mimeType":"audio/webm","url":"https://r1.googlevideo.com/opus"},{"itag":140,"mimeType":"audio/mp4; codecs=\"mp4a.40.2\"","url":"https://r1.googlevideo.com/aac"}]}}"#.utf8)
        XCTAssertEqual(MusicCatalogService.selectDeviceAudioURL(data, videoId: "9Et9XGVMmUw")?.path, "/aac")
        XCTAssertNil(MusicCatalogService.selectDeviceAudioURL(data, videoId: "6O8kvPpiQy8"))
    }

    func testDeviceAudioRejectsBlockedAndUntrustedStreams() throws {
        for (status, url) in [("LOGIN_REQUIRED", "https://r1.googlevideo.com/aac"), ("OK", "https://googlevideo.com.attacker.example/aac"), ("OK", "http://r1.googlevideo.com/aac")] {
            let data = try JSONSerialization.data(withJSONObject: [
                "playabilityStatus": ["status": status], "videoDetails": ["videoId": "9Et9XGVMmUw"],
                "streamingData": ["adaptiveFormats": [["itag": 140, "mimeType": "audio/mp4", "url": url]]]
            ])
            XCTAssertNil(MusicCatalogService.selectDeviceAudioURL(data, videoId: "9Et9XGVMmUw"))
        }
    }

    @MainActor func testPlaylistsKeepTheirOrderAndAvoidDuplicates() throws {
        let store = LibraryStore()
        store.activate("test-\(UUID().uuidString)")
        defer { try? store.eraseAccountFiles() }
        store.createPlaylist("  Dans le train  ")
        let playlist = try XCTUnwrap(store.playlists.first)
        XCTAssertEqual(playlist.name, "Dans le train")
        let first = Track(title: "A"), second = Track(title: "B")
        store.add(first, to: playlist); store.add(second, to: playlist); store.add(first, to: playlist)
        XCTAssertEqual(store.playlists.first?.trackIDs, [first.id, second.id])
        store.remove(first, from: playlist)
        XCTAssertEqual(store.playlists.first?.trackIDs, [second.id])
    }

    @MainActor func testAccountsHaveSeparatePersistentLibraries() throws {
        let firstID = "test-\(UUID().uuidString)", secondID = "test-\(UUID().uuidString)"
        let store = LibraryStore()
        defer {
            store.activate(firstID); try? store.eraseAccountFiles()
            store.activate(secondID); try? store.eraseAccountFiles()
        }
        store.activate(firstID); store.createPlaylist("Privée")
        store.activate(secondID); XCTAssertTrue(store.playlists.isEmpty)
        store.activate(firstID); XCTAssertEqual(store.playlists.first?.name, "Privée")
    }

    @MainActor func testOfflineAvailabilityRequiresAnActualFile() throws {
        let store = LibraryStore(); store.activate("test-\(UUID().uuidString)")
        defer { try? store.eraseAccountFiles() }
        let track = Track(title: "Hors connexion", fileName: "audio.m4a")
        XCTAssertNil(store.localURL(track))
        let url = try XCTUnwrap(store.fileURL("audio.m4a"))
        try Data([0, 1, 2]).write(to: url)
        XCTAssertEqual(store.localURL(track), url)
        XCTAssertNil(store.fileURL("../outside.m4a"))
        XCTAssertNil(store.fileURL("/tmp/outside.m4a"))
    }

    func testTrackAndPreferencesSurviveOfflineSerialization() throws {
        var snapshot = LibrarySnapshot()
        let track = Track(title: "L’été", artist: "Artiste", duration: 185, fileName: "local.m4a", spotifyId: "4uLU6hMCjMI75M1A2tKUQC")
        snapshot.tracks = [track]; snapshot.likedIDs = [track.id]; snapshot.wifiOnly = false
        let restored = try JSONDecoder().decode(LibrarySnapshot.self, from: JSONEncoder().encode(snapshot))
        XCTAssertEqual(restored.tracks, [track]); XCTAssertTrue(restored.likedIDs.contains(track.id)); XCTAssertFalse(restored.wifiOnly)
        XCTAssertEqual(185.0.clockTime, "3:05"); XCTAssertEqual(Double.nan.clockTime, "0:00")
        XCTAssertEqual(restored.tracks.first?.spotifyId, "4uLU6hMCjMI75M1A2tKUQC")
    }

    func testLRCParserHandlesOffsetsAndRepeatedTimestamps() {
        let lrc = """
        [offset:+500]
        [00:01.00][00:04.25]Première ligne
        [00:08.5]Deuxième ligne
        """
        let lines = LyricsService.parseLRC(lrc)
        XCTAssertEqual(lines.map(\.text), ["Première ligne", "Première ligne", "Deuxième ligne"])
        XCTAssertEqual(lines.map(\.time), [1.5, 4.75, 9.0])
    }

    func testInterludesDoNotShortenSustainedPhrases() {
        let lrc = """
        [00:00.00]Une phrase qui dure longtemps
        [00:05.00]Encore
        [00:14.00]La suite
        """
        let lines = LyricsService.parseLRC(lrc, insertInterludes: true)
        XCTAssertEqual(lines.map(\.text), ["Une phrase qui dure longtemps", "Encore", "La suite"])
        XCTAssertEqual(lines.map(\.time), [0, 5, 14])
        XCTAssertEqual(lines[1].time - lines[0].time, 5)
        XCTAssertEqual(lines[2].time - lines[1].time, 9)
    }

    func testInterludesOnlyAddKnownIntroBeforeFirstPhrase() {
        let lrc = "[00:08.00]Première phrase\n[00:13.00]Deuxième phrase"
        let lines = LyricsService.parseLRC(lrc, insertInterludes: true)
        XCTAssertEqual(lines.map(\.text), ["•••", "Première phrase", "Deuxième phrase"])
        XCTAssertEqual(lines.map(\.time), [0, 8, 13])
        XCTAssertEqual(LyricsService.parseLRC(lrc).count, 2)
    }

    func testLyricsCandidateUsesTheActualPlaybackDuration() throws {
        let short = LyricsService.LRCLIBResponse(trackName: "Ainsi va la rue", artistName: "Rim'K", duration: 132, plainLyrics: nil, syncedLyrics: "[00:01.00]Court")
        let full = LyricsService.LRCLIBResponse(trackName: "Ainsi va la rue", artistName: "Rim'K", duration: 158, plainLyrics: nil, syncedLyrics: "[00:01.00]Complet")
        let choice = try XCTUnwrap(LyricsService.bestCandidate([short, full], title: "Ainsi va la rue", artist: "Rim'K", duration: 158))
        XCTAssertEqual(choice.duration, 158)
    }

    func testLyricsCandidatePrefersSyncedOverPlain() throws {
        let plain = LyricsService.LRCLIBResponse(trackName: "Le bonheur est triste", artistName: "Saïf", duration: 155, plainLyrics: "Texte brut", syncedLyrics: nil)
        let synced = LyricsService.LRCLIBResponse(trackName: "Le bonheur est triste", artistName: "Saif, Pato", duration: 155, plainLyrics: "Texte brut", syncedLyrics: "[00:18.98]Texte synchronisé")
        let choice = try XCTUnwrap(LyricsService.bestCandidate([plain, synced], title: "Le bonheur est triste", artist: "Saïf", duration: 155))
        XCTAssertEqual(choice.artistName, "Saif, Pato")
        XCTAssertNotNil(choice.syncedLyrics)
    }

    func testYouTubeResolverPrefersMatchingStudioAudio() throws {
        let live = MusicCatalogService.YouTubeCandidate(videoId: "AAAAAAAAAAA", title: "Ainsi va la rue (Live)", channel: "Concert TV", duration: 158)
        let studio = MusicCatalogService.YouTubeCandidate(videoId: "BBBBBBBBBBB", title: "Rim'K - Ainsi va la rue (Official Audio)", channel: "Rim'K - Topic", duration: 158)
        let choice = try XCTUnwrap(MusicCatalogService.bestYouTubeCandidate([live, studio], title: "Ainsi va la rue", artist: "Rim'K", duration: 158))
        XCTAssertEqual(choice.videoId, "BBBBBBBBBBB")
    }

    func testYouTubeSearchHTMLKeepsMetadataTogether() throws {
        let html = #"{"videoRenderer":{"videoId":"BBBBBBBBBBB","title":{"runs":[{"text":"Rim'K - Ainsi va la rue"}]},"longBylineText":{"runs":[{"text":"Rim'K - Topic"}]},"lengthText":{"simpleText":"2:38"}}}"#
        let item = try XCTUnwrap(MusicCatalogService.parseYouTubeCandidates(html).first)
        XCTAssertEqual(item.title, "Rim'K - Ainsi va la rue")
        XCTAssertEqual(item.channel, "Rim'K - Topic")
        XCTAssertEqual(item.duration, 158)
    }
}


final class SpicyWaveAnimationTests: XCTestCase {
    func testLetterWaveDependsOnSungDurationNotSpelling() {
        XCTAssertFalse(SpicyWaveTiming.usesLetterWave(text: "extraordinairement", duration: 0.999))
        XCTAssertTrue(SpicyWaveTiming.usesLetterWave(text: "oh", duration: 1))
        XCTAssertTrue(SpicyWaveTiming.usesLetterWave(text: "lundi", duration: 1.4))
        XCTAssertFalse(SpicyWaveTiming.usesLetterWave(text: "lundi", duration: 0.3))
    }

    func testEnhancedLRCPreservesHeldWordAndEndMarker() throws {
        let lrc = "[00:10.00]<00:10.00>du <00:10.20>lundi <00:10.50>au <00:10.70>lundi<00:12.20>\n[00:15.00]Suite"
        let lines = LyricsService.parseLRC(lrc, insertInterludes: true)
        let line = try XCTUnwrap(lines.first(where: { $0.text == "du lundi au lundi" }))
        let words = line.animationWords(duration: 5)
        XCTAssertEqual(words.map(\.text), ["du", "lundi", "au", "lundi"])
        XCTAssertEqual(try XCTUnwrap(words.last?.end), 12.2, accuracy: 1e-9)
        let held = words.map { SpicyWaveTiming.usesLetterWave(text: $0.text, duration: ($0.end ?? 0) - $0.start) }
        XCTAssertEqual(held, [false, false, false, true])
        XCTAssertEqual(lines.filter { $0.text == "•••" }.count, 1) // intro only
    }

    func testEnhancedLRCOffsetsAndRepeatedLines() throws {
        let lines = LyricsService.parseLRC("[offset:+500]\n[00:01.00][00:10.00]<00:01.00>oh<00:02.50>")
        XCTAssertEqual(lines.map(\.time), [1.5, 10.5])
        XCTAssertEqual(lines[0].words.first?.start, 1.5)
        XCTAssertEqual(lines[1].words.first?.start, 10.5)
        XCTAssertEqual(lines[1].words.first?.end, 12)
    }

    func testPlainLRCFallbackKeepsFullPhraseDuration() throws {
        let line = LyricLine(time: 5, text: "Un mot tenu")
        let words = line.animationWords(duration: 8)
        XCTAssertEqual(words.first?.start, 5)
        XCTAssertEqual(try XCTUnwrap(words.last?.end), 13, accuracy: 1e-9)
    }

    func testSourceCurveKnotsAndEndpoints() {
        XCTAssertEqual(SpicyWaveCurve.scale.value(at: 0), 0.95, accuracy: 1e-12)
        XCTAssertEqual(SpicyWaveCurve.scale.value(at: 0.7), 1.0505, accuracy: 1e-12)
        XCTAssertEqual(SpicyWaveCurve.letterScale.value(at: 0.7), 1.175, accuracy: 1e-12)
        XCTAssertEqual(SpicyWaveCurve.lift.value(at: 0.9), -1.0 / 60, accuracy: 1e-12)
        XCTAssertEqual(SpicyWaveCurve.letterLift.value(at: 0.9), -1.0 / 56, accuracy: 1e-12)
        XCTAssertEqual(SpicyWaveCurve.glow.value(at: 0.15), 1, accuracy: 1e-12)
        XCTAssertEqual(SpicyWaveCurve.glow.value(at: 0.6), 1, accuracy: 1e-12)
        XCTAssertEqual(SpicyWaveCurve.scale.value(at: 2), 1, accuracy: 1e-12)
        XCTAssertEqual(SpicyWaveCurve.glow.value(at: -1), 0, accuracy: 1e-12)
    }

    func testSpringIsIndependentOfDisplayRefreshRate() {
        for (frequency, damping) in [(0.88, 0.64), (1.45, 0.40), (1.18, 0.56)] {
            var sixty = SpicyWaveSpring(position: 0.95, frequency: frequency, damping: damping)
            var oneTwenty = sixty
            for _ in 0..<60 { sixty.step(goal: 1.175, dt: 1.0 / 60) }
            for _ in 0..<120 { oneTwenty.step(goal: 1.175, dt: 1.0 / 120) }
            XCTAssertEqual(sixty.position, oneTwenty.position, accuracy: 1e-10)
            XCTAssertEqual(sixty.velocity, oneTwenty.velocity, accuracy: 1e-10)
        }
    }

    func testSeekingClearsSpringMomentum() {
        var spring = SpicyWaveSpring(position: 0.95, frequency: 0.88, damping: 0.64)
        spring.step(goal: 1.175, dt: 0.1)
        XCTAssertNotEqual(spring.velocity, 0)
        spring.step(goal: 0.95, dt: 0, snap: true)
        XCTAssertEqual(spring.position, 0.95)
        XCTAssertEqual(spring.velocity, 0)
        spring.step(goal: 0.95, dt: 1.0 / 60)
        XCTAssertEqual(spring.position, 0.95, accuracy: 1e-12)
    }

    func testBackingVocalsParenthesesStripped() {
        let line = LyricLine(time: 10, text: "(Mathafack)")
        XCTAssertTrue(line.isBackground)
        XCTAssertEqual(line.text, "Mathafack")
        let words = line.animationWords(duration: 2)
        XCTAssertEqual(words.map(\.text), ["Mathafack"])
        XCTAssertTrue(words.allSatisfy(\.isBackground))
    }

    func testTrailingBackingVocalsSplitOntoSeparateLine() {
        let lrc = "[00:10.00]Wesh alors, ma race, tranquille ou quoi (oh, mathafuck)\n[00:15.00]Deuxième ligne"
        let lines = LyricsService.parseLRC(lrc)
        XCTAssertEqual(lines.count, 3)
        XCTAssertEqual(lines[0].text, "Wesh alors, ma race, tranquille ou quoi")
        XCTAssertFalse(lines[0].isBackground)
        XCTAssertEqual(lines[1].text, "oh, mathafuck")
        XCTAssertTrue(lines[1].isBackground)
        XCTAssertEqual(lines[2].text, "Deuxième ligne")
        XCTAssertFalse(lines[2].isBackground)
    }

    func testBackingVocalsConcurrentPhraseOverlap() {
        let lrc = "[00:10.00]Wesh alors, ma race, tranquille ou quoi (oh, mathafuck)\n[00:15.00]Deuxième ligne"
        let lines = LyricsService.parseLRC(lrc)
        let lead = lines[0]
        let back = lines[1]
        XCTAssertEqual(lead.endTime, 15.0)
        XCTAssertEqual(back.endTime, 15.0)
        XCTAssertGreaterThan(back.time, lead.time)
        XCTAssertLessThan(back.time, 15.0)
    }
}

final class CrossfadeMathTests: XCTestCase {
    func testEqualPowerGainsKeepLoudnessConstant() {
        for step in 0...40 {
            let gains = CrossfadeMath.gains(progress: Double(step) / 40)
            XCTAssertEqual(Double(gains.out * gains.out + gains.in * gains.in), 1, accuracy: 0.0001)
        }
        XCTAssertEqual(CrossfadeMath.gains(progress: 0).out, 1, accuracy: 0.0001)
        XCTAssertEqual(CrossfadeMath.gains(progress: 0).in, 0, accuracy: 0.0001)
        XCTAssertEqual(CrossfadeMath.gains(progress: 1).out, 0, accuracy: 0.0001)
        XCTAssertEqual(CrossfadeMath.gains(progress: 1).in, 1, accuracy: 0.0001)
        XCTAssertEqual(CrossfadeMath.gains(progress: 0.5).out, CrossfadeMath.gains(progress: 0.5).in, accuracy: 0.0001)
    }

    func testGainsAreClampedAndMonotonic() {
        XCTAssertEqual(CrossfadeMath.gains(progress: -3).out, 1, accuracy: 0.0001)
        XCTAssertEqual(CrossfadeMath.gains(progress: 7).in, 1, accuracy: 0.0001)
        XCTAssertEqual(CrossfadeMath.gains(progress: .nan).in, 1, accuracy: 0.0001)
        var previous = CrossfadeMath.gains(progress: 0)
        for step in 1...40 {
            let gains = CrossfadeMath.gains(progress: Double(step) / 40)
            XCTAssertLessThanOrEqual(gains.out, previous.out)
            XCTAssertGreaterThanOrEqual(gains.in, previous.in)
            previous = gains
        }
    }

    func testFadeIsCappedForShortSongs() {
        XCTAssertEqual(CrossfadeMath.effectiveFade(setting: 6, outgoingLength: 200, incomingLength: 180), 6)
        XCTAssertEqual(CrossfadeMath.effectiveFade(setting: 6, outgoingLength: 10, incomingLength: 200), 4, accuracy: 1e-9)
        XCTAssertEqual(CrossfadeMath.effectiveFade(setting: 6, outgoingLength: 200, incomingLength: 5), 2, accuracy: 1e-9)
        XCTAssertEqual(CrossfadeMath.effectiveFade(setting: 6, outgoingLength: 30, incomingLength: 0), 6)
        XCTAssertEqual(CrossfadeMath.effectiveFade(setting: 0, outgoingLength: 200, incomingLength: 200), 0)
        XCTAssertEqual(CrossfadeMath.effectiveFade(setting: 6, outgoingLength: 0, incomingLength: 200), 0)
    }

    func testUpcomingIndexFollowsQueueRules() {
        func upcoming(_ current: Int, _ count: Int, _ mode: RepeatMode) -> Int? {
            CrossfadeMath.upcomingIndex(current: current, count: count, shuffle: false, repeatMode: mode)
        }
        XCTAssertEqual(upcoming(0, 3, .off), 1)
        XCTAssertNil(upcoming(2, 3, .off))
        XCTAssertEqual(upcoming(2, 3, .all), 0)
        XCTAssertNil(upcoming(0, 3, .one))
        XCTAssertNil(upcoming(0, 0, .all))
        XCTAssertNil(upcoming(0, 1, .off))
        XCTAssertEqual(upcoming(0, 1, .all), 0)
    }

    func testShuffleNeverPicksTheCurrentTrackAndReachesAllOthers() {
        for current in 0..<5 {
            let reached = (0..<4).compactMap { pick in
                CrossfadeMath.upcomingIndex(current: current, count: 5, shuffle: true, repeatMode: .off, random: { _ in pick })
            }
            XCTAssertEqual(reached.count, 4)
            XCTAssertFalse(reached.contains(current))
            XCTAssertEqual(Set(reached), Set(0..<5).subtracting([current]))
        }
        XCTAssertNil(CrossfadeMath.upcomingIndex(current: 0, count: 5, shuffle: true, repeatMode: .one))
    }
}

/// Real playback with two generated audio files on the simulator.
@MainActor final class CrossfadePlaybackTests: XCTestCase {
    private func makeFixture(lengths: [Double], fade: Double) throws -> (LibraryStore, AudioPlayer, [Track], @MainActor () -> Void) {
        let store = LibraryStore()
        store.activate("xfade-\(UUID().uuidString)")
        let previousSetting = UserDefaults.standard.object(forKey: "nw.crossfadeSeconds")
        let tracks = try lengths.enumerated().map { offset, length in
            try writeTone("xfade-\(offset).wav", seconds: length, frequency: 330 + Double(offset) * 110, in: store)
        }
        let player = AudioPlayer()
        player.connect(store)
        player.crossfadeSeconds = fade
        let cleanup: @MainActor () -> Void = {
            player.stop()
            try? store.eraseAccountFiles()
            if let previousSetting { UserDefaults.standard.set(previousSetting, forKey: "nw.crossfadeSeconds") }
            else { UserDefaults.standard.removeObject(forKey: "nw.crossfadeSeconds") }
        }
        return (store, player, tracks, cleanup)
    }

    private func writeTone(_ name: String, seconds: Double, frequency: Double, in store: LibraryStore) throws -> Track {
        let url = try XCTUnwrap(store.fileURL(name))
        let rate = 44_100
        let frames = Int(seconds * Double(rate))
        var pcm = Data(capacity: frames * 2)
        for frame in 0..<frames {
            let sample = Int16(sin(2 * .pi * frequency * Double(frame) / Double(rate)) * 6000)
            withUnsafeBytes(of: sample.littleEndian) { pcm.append(contentsOf: $0) }
        }
        var wav = Data()
        func u32(_ value: UInt32) { withUnsafeBytes(of: value.littleEndian) { wav.append(contentsOf: $0) } }
        func u16(_ value: UInt16) { withUnsafeBytes(of: value.littleEndian) { wav.append(contentsOf: $0) } }
        wav.append(contentsOf: "RIFF".utf8); u32(UInt32(36 + pcm.count)); wav.append(contentsOf: "WAVEfmt ".utf8)
        u32(16); u16(1); u16(1); u32(UInt32(rate)); u32(UInt32(rate * 2)); u16(2); u16(16)
        wav.append(contentsOf: "data".utf8); u32(UInt32(pcm.count)); wav.append(pcm)
        try wav.write(to: url)
        return Track(title: name, artist: "Test", duration: seconds, fileName: name)
    }

    private func waitUntil(_ timeout: Double, _ condition: () -> Bool) async -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return true }
            try? await Task.sleep(for: .milliseconds(40))
        }
        return condition()
    }

    private func startPlayback(_ player: AudioPlayer, _ track: Track, in tracks: [Track]) async throws {
        player.play(track, in: tracks)
        guard await waitUntil(6, { player.isPlaying && player.elapsed > 0.2 }) else {
            throw XCTSkip("Aucune sortie audio sur ce simulateur : la lecture réelle ne peut pas être vérifiée ici.")
        }
    }

    func testFadesIntoNextDownloadedTrackWithRealOverlap() async throws {
        let (_, player, tracks, cleanup) = try makeFixture(lengths: [6, 6], fade: 2)
        defer { cleanup() }
        try await startPlayback(player, tracks[0], in: tracks)

        let ok1 = await waitUntil(8) { player.isCrossfading }

        XCTAssertTrue(ok1, "Le fondu n'a jamais démarré")
        XCTAssertEqual(player.current?.id, tracks[1].id, "L'interface doit afficher le titre entrant dès le début du fondu")
        XCTAssertEqual(player.fadeSnapshot?.outgoingPlaying, true, "Le titre sortant doit encore jouer pendant le fondu")

        var sawBothAudible = false
        var samples = 0
        while player.isCrossfading, samples < 200 {
            if let snapshot = player.fadeSnapshot {
                let power = Double(snapshot.outgoingVolume * snapshot.outgoingVolume + snapshot.incomingVolume * snapshot.incomingVolume)
                XCTAssertEqual(power, 1, accuracy: 0.05, "Le volume perçu doit rester constant pendant le fondu")
                if snapshot.outgoingVolume > 0.3 && snapshot.incomingVolume > 0.3 { sawBothAudible = true }
            }
            samples += 1
            try await Task.sleep(for: .milliseconds(20))
        }
        XCTAssertTrue(sawBothAudible, "Les deux titres doivent être audibles en même temps au milieu du fondu")
        XCTAssertFalse(player.isCrossfading, "Le fondu doit se terminer")
        XCTAssertNil(player.fadeSnapshot)
        XCTAssertEqual(player.current?.id, tracks[1].id)
        let ok2 = await waitUntil(2) { player.isPlaying }
        XCTAssertTrue(ok2)
        XCTAssertGreaterThan(player.elapsed, 1, "Le titre entrant doit continuer depuis le fondu, pas redémarrer à zéro")
    }

    func testPauseDuringFadeStopsThePreviousSongAndKeepsTheNewOne() async throws {
        let (_, player, tracks, cleanup) = try makeFixture(lengths: [6, 6], fade: 2)
        defer { cleanup() }
        try await startPlayback(player, tracks[0], in: tracks)
        let ok3 = await waitUntil(8) { player.isCrossfading }
        XCTAssertTrue(ok3)

        player.pause()
        XCTAssertFalse(player.isCrossfading)
        XCTAssertNil(player.fadeSnapshot)
        XCTAssertEqual(player.current?.id, tracks[1].id)
        try await Task.sleep(for: .milliseconds(600))
        XCTAssertFalse(player.isPlaying)
        XCTAssertEqual(player.current?.id, tracks[1].id)

        player.resume()
        let ok4 = await waitUntil(3) { player.isPlaying }
        XCTAssertTrue(ok4)
        XCTAssertEqual(player.current?.id, tracks[1].id)
    }

    func testNextDuringFadeSkipsTheIncomingSong() async throws {
        let (_, player, tracks, cleanup) = try makeFixture(lengths: [6, 6, 6], fade: 2)
        defer { cleanup() }
        try await startPlayback(player, tracks[0], in: tracks)
        let ok5 = await waitUntil(8) { player.isCrossfading }
        XCTAssertTrue(ok5)

        player.next()
        XCTAssertFalse(player.isCrossfading)
        XCTAssertEqual(player.current?.id, tracks[2].id)
        let ok6 = await waitUntil(3) { player.isPlaying }
        XCTAssertTrue(ok6)
    }

    func testRepeatOneNeverCrossfades() async throws {
        let (_, player, tracks, cleanup) = try makeFixture(lengths: [4, 4], fade: 2)
        defer { cleanup() }
        player.repeatMode = .one
        try await startPlayback(player, tracks[0], in: tracks)
        var faded = false
        _ = await waitUntil(6) { faded = faded || player.isCrossfading; return false }
        XCTAssertFalse(faded)
        XCTAssertEqual(player.current?.id, tracks[0].id)
    }

    func testDisabledCrossfadeStillAdvancesAtTheEnd() async throws {
        let (_, player, tracks, cleanup) = try makeFixture(lengths: [3, 3], fade: 0)
        defer { cleanup() }
        try await startPlayback(player, tracks[0], in: tracks)
        var faded = false
        let advanced = await waitUntil(7) { faded = faded || player.isCrossfading; return player.current?.id == tracks[1].id }
        XCTAssertTrue(advanced)
        XCTAssertFalse(faded)
    }

    func testLastTrackWithoutRepeatDoesNotFade() async throws {
        let (_, player, tracks, cleanup) = try makeFixture(lengths: [4], fade: 2)
        defer { cleanup() }
        try await startPlayback(player, tracks[0], in: tracks)
        var faded = false
        _ = await waitUntil(6) { faded = faded || player.isCrossfading; return false }
        XCTAssertFalse(faded)
        XCTAssertFalse(player.isPlaying)
    }
}
