# usage: python _grab.py <exec-uuid-prefix> <name> : copy that generated image to ham/p2-a-<name>.png + md5 line
import os,glob,sys,hashlib,shutil
G=os.path.expanduser('~/.codex/generated_images')
src=glob.glob(G+'/*/exec-'+sys.argv[1]+'*.png')[0]
dst='ham/p2-a-%s.png'%sys.argv[2]
shutil.copy(src,dst)
m=lambda p:hashlib.md5(open(p,'rb').read()).hexdigest()
a,b=m(dst),m(src)
open('ham/md5-p2a.txt','a').write('%s %s %s\n'%(a,b,src.replace(chr(92),'/')))
print(sys.argv[2],a==b)
