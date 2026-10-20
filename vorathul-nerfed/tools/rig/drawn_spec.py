"""Cut specification for the drawn Vorathul sheets (video/public/rig/drawn/rig-M.png and rig-V1..V5.png).

All coordinates are pixels of the 1024x1536 rig master M unless a sheet is named. R parts are on the screen-LEFT of the master
(the character's right); the L side is the mirror, so only R is cut. `pivot` is the joint centre; `axis_to` is the point the limb
points at (the next joint), used to rotate the limb so that it hangs straight down in its own image (rig angle 0 = hanging).
"""

# Floor row and crown-tip row of the master: 1 H = FLOOR_Y - CROWN_Y.
FLOOR_Y = 1483
CROWN_Y = 38
ROOT_X = 512

# --- polygons in master pixels (screen-left side for sided parts) ---
POLY = {
    # central parts (full width)
    "head": [(372, 22), (440, 60), (458, 125), (570, 125), (585, 60), (656, 22), (660, 80), (650, 150), (590, 170), (572, 270), (452, 270), (434, 170), (372, 150), (362, 80)],
    "crown": [(455, 30), (570, 30), (570, 132), (455, 132)],
    "collar": [(392, 245), (430, 205), (462, 255), (562, 255), (594, 205), (632, 245), (656, 305), (606, 338), (512, 352), (418, 338), (368, 305)],
    "torso": [(392, 300), (632, 300), (640, 420), (625, 520), (608, 600), (416, 600), (400, 520), (384, 420)],
    "pelvis": [(352, 540), (672, 540), (704, 640), (708, 705), (316, 705), (320, 640)],
    # screen-left side
    "pauldron": [(330, 200), (298, 232), (250, 272), (212, 352), (222, 405), (250, 428), (296, 454), (345, 462), (408, 440), (436, 382), (434, 300), (395, 248), (360, 212)],
    "upper_arm": [(250, 425), (336, 425), (348, 470), (322, 545), (304, 602), (255, 606), (212, 600), (200, 560), (222, 500), (236, 455)],
    "forearm": [(305, 590), (262, 598), (212, 592), (186, 650), (160, 704), (176, 726), (232, 726), (262, 690), (294, 640)],
    "hand_open": [(146, 716), (176, 716), (236, 730), (252, 800), (250, 830), (212, 876), (160, 836), (140, 790)],
    "leg": [(318, 700), (450, 700), (452, 1000), (440, 1240), (392, 1300), (392, 1400), (372, 1440), (300, 1486), (232, 1470), (250, 1420), (316, 1300), (306, 1100), (312, 940)],
    "cape_upper": [(330, 400), (512, 330), (700, 400), (790, 640), (240, 640)],
    "cape_lower": [(240, 620), (790, 620), (890, 1420), (130, 1420)],
}

# joint pivots in master pixels (R side = screen-left)
PIVOT = {
    "pelvis": (512, 592),
    "leg": (385, 760),  # top centre of the thigh, under the tasset
    "torso": (512, 560),
    "collar": (512, 340),
    "pauldron": (335, 410),
    "upper_arm": (335, 410),
    "forearm": (232, 590),
    "hand_open": (205, 722),
    "head": (512, 262),
    "crown": (512, 128),
    "cape_upper": (512, 345),
    "cape_lower": (512, 640),
}
