from pathlib import Path
out=Path(__file__).parent
flags={}
def stripes(colors,vertical=False):
 n=len(colors)
 return ''.join(f'<rect x="{i*300/n if vertical else 0}" y="{0 if vertical else i*200/n}" width="{300/n if vertical else 300}" height="{200 if vertical else 200/n}" fill="{c}"/>' for i,c in enumerate(colors))
for code,colors in {'fr':['#002395','#fff','#ed2939'],'it':['#009246','#fff','#ce2b37'],'be':['#111','#fdda24','#ef3340'],'ie':['#169b62','#fff','#ff883e'],'ro':['#002b7f','#fcd116','#ce1126'],'ng':['#008751','#fff','#008751']}.items(): flags[code]=stripes(colors,True)
for code,colors in {'de':['#111','#d00','#ffce00'],'ua':['#0057b7','#ffd700'],'pl':['#fff','#dc143c'],'nl':['#ae1c28','#fff','#21468b'],'at':['#ed2939','#fff','#ed2939'],'bg':['#fff','#00966e','#d62612'],'hu':['#ce2939','#fff','#477050'],'ee':['#4891d9','#111','#fff'],'lt':['#fdb913','#006a44','#c1272d'],'id':['#ff0000','#fff']}.items(): flags[code]=stripes(colors)
flags['lv']='<path fill="#9e1b34" d="M0 0h300v200H0z"/><path fill="#fff" d="M0 80h300v40H0z"/>'
flags['jp']='<path fill="#fff" d="M0 0h300v200H0z"/><circle cx="150" cy="100" r="60" fill="#bc002d"/>'
flags['bd']='<path fill="#006a4e" d="M0 0h300v200H0z"/><circle cx="135" cy="100" r="60" fill="#f42a41"/>'
for code,bg,cross,w in [('se','#006aa7','#fecc00',32),('fi','#fff','#003580',42),('dk','#c60c30','#fff',24)]: flags[code]=f'<path fill="{bg}" d="M0 0h300v200H0z"/><path fill="{cross}" d="M85 0h{w}v200H85zM0 {100-w/2}h300v{w}H0z"/>'
flags['ch']='<path fill="#d52b1e" d="M0 0h300v200H0z"/><path fill="#fff" d="M132 40h36v120h-36zM90 82h120v36H90z"/>'
flags['cz']=stripes(['#fff','#d7141a'])+'<path fill="#11457e" d="M0 0l150 100L0 200z"/>'
flags['gr']=stripes(['#0d5eaf','#fff']*4+['#0d5eaf'])+'<path fill="#0d5eaf" d="M0 0h111v111H0z"/><path fill="#fff" d="M44 0h23v111H44zM0 44h111v23H0z"/>'
flags['es']='<path fill="#aa151b" d="M0 0h300v200H0z"/><path fill="#f1bf00" d="M0 50h300v100H0z"/><g transform="translate(71 77)"><path fill="#eee" stroke="#9e7533" stroke-width="2" d="M0 0h35v32Q17 48 0 32z"/><path fill="#aa151b" d="M2 2h15v15H2zM18 18h15v15H18z"/><path fill="#e6bd4b" d="M18 2h15v15H18zM2 18h15v15H2zM-2-6h39v6H-2z"/><path stroke="#eee" stroke-width="5" d="M-8 5v32M43 5v32"/><path stroke="#aa151b" stroke-width="2" d="M-12 18h8M39 18h8"/><path fill="#aa151b" d="M5-9l3-8 9 4 9-4 3 8z"/></g>'
for code,body in flags.items(): (out/f'{code}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">{body}</svg>')
