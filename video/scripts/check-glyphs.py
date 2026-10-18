import sys
from fontTools.ttLib import TTFont
need = "ıİşŞğĞçÇöÖüÜ"
bad = 0
for p in sys.argv[1:]:
    cmap = TTFont(p).getBestCmap()
    miss = [c for c in need if ord(c) not in cmap]
    print(p.split('/')[-1], "MISSING:" + "".join(miss) if miss else "all 12 present")
    bad += bool(miss)
sys.exit(1 if bad else 0)
