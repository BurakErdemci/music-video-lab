# Section specs for takes other than v1: SPECS[version] = [(name, lyric header prefix, first bar index, why this bar)];
# the bar index counts from the first downbeat. Names follow the lyric tags; None = a passage the audio has and the lyric tags do not.
SPECS['v4'] = [
    ("intro_robot", "Intro", 0, "file start; two flat robot lines 0.0-1.22 and 1.9-4.46"),
    ("intro_groove", None, 3, "instrumental: bass and full drums enter at 4.37, no sung word until verse 1"),
    ("verse1_sweet", "Verse 1", 12, "downbeat of the bar holding the first word (16.88)"),
    ("verse2_raspy", "Verse 2", 20, "downbeat of the bar holding the first word (27.68); band stop 26.0-27.7 just before"),
    ("prechorus", "Pre-Chorus", 29, "first 'Blue!' (38.40) is a 0.51 s pickup, bound to the next downbeat"),
    ("chorus1", "Chorus", 32, "first 'Accept' 42.84 is on the downbeat (-0.06 s)"),
    ("verse3_rebase", "Verse 3", 48, "downbeat after the chorus; 'I' heard at 64.64"),
    ("chorus2", "Chorus", 64, "first 'Accept' 85.38 is on the downbeat (-0.04 s)"),
    ("verse4_trade", "Verse 4", 80, "first 'You' 106.84 is 0.16 s after the downbeat"),
    ("scream", "Both voices scream", 88, "'I KNOW! I TOUCHED IT!' ends 117.74; no heard word until GIT at 120.68; band stop 116.5-117.2 before"),
    ("breakdown_git_push_force", "Breakdown", 90, "heaviest riff returns on this downbeat; GIT enters at 120.68, PUSH 124.32, FORCE 125.02 (3.4 s apart)"),
    ("whisper", "Sweet voice, horrified", 94, "'You wouldn't' 125.52-126.74 starts in the previous bar and ends in this one"),
    ("guitar_solo", "Guitar Solo", 95, "downbeat after 'wouldn't'; no heard word to 142.4; the solo ends where bass and the heavy drums leave at 140.04"),
    ("piano_interlude", "Soft Interlude", 105, "bass and drums leave (bass -56 then -85 dB, drums -44 dB); 'Maybe' 142.44"),
    ("build", "Build", 112, "drums return +14 dB under 'We're the same file' 149.12"),
    ("final_chorus", "Final Chorus", 120, "first 'Accept' 160.04 is on the downbeat"),
    ("post_chorus_chant", "Post-Chorus", 136, "downbeat after 'soul' ends (180.3); first chant 'Accept' 182.14"),
    ("robot_build_failed", "Music stops", 145, "drums and bass cut at 193.5; robot 'Failed' heard 193.1-193.8, 'Syntax error' 194.22-196.49"),
    ("scream_end", "Both voices scream", 147, "last downbeat before the metal returns: bass and drums re-enter on beat 3 of this bar at 196.9-197.2"),
    ("outro", "Outro", 160, "no heard word 196.5-231: split from scream_end at the one energy break (bar 160: bass -50 dB, 18 % under 150 Hz); heavy blast-beat metal to 229.6, then decay"),
]
