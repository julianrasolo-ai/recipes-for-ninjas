"""Generates ice-cream/index.html and juice/index.html from one template. Run: python3 scripts/pages.py"""
import json
T=open('scripts/section.template.html').read()
P={
 "ice-cream":dict(title="Swirl Club · Ninja Swirl recipes",desc="78 easy family recipes for the Ninja Swirl by CREAMi: fruit, healthy, protein and real soft serve.",
   brand="Swirl Club",w1="Swirl",w2="it.",lede="78 easy recipes for your Ninja Swirl. Fruit, healthy, protein and real soft serve.",
   hero="/img/ice/hero.jpg",heroAlt="A tall vanilla soft-serve swirl in a cone",heroCdn="",other="/juice/",otherLabel="🧃 Juice",
   search="Search mango, chocolate, protein…",toggle="Healthy",
   foot="Freeze every pint flat for 24 hours. Crumbly? Press Re-Spin.<br>Recipes adapted from the Ninja Swirl guide and popular CREAMi recipes.",
   site=dict(key="ice",data="/data/ice.json",pantry="Sugar, vanilla extract, salt",haveNote="Tap everything in your kitchen. Sugar, vanilla and salt are assumed.",
     focus=[["all","Anything"],["healthy","🌿 Healthy"],["fruit","🍓 Fruit"]],haveColor="healthy",favColor="fruit")),
 "juice":dict(title="Press Club · Ninja NeverClog juices",desc="42 cold-pressed juices for the Ninja NeverClog juicer, searchable by ingredient and by benefit.",
   brand="Press Club",w1="Press",w2="it.",lede="42 cold-pressed juices for your Ninja NeverClog. Greens, citrus, shots and mocktails.",
   hero="/img/juice/hero.jpg",heroAlt="Three glasses of fresh green, orange and pink juice",
   heroCdn=json.load(open('data/juice-images.json'))['hero']['min'],other="/ice-cream/",otherLabel="🍦 Ice cream",
   search="Search apple, ginger, energy…",toggle="Low sugar",
   foot="Turn the juicer on before adding food. Cut pieces to about 2 inches, peel citrus, pit stone fruit.<br>Black filter = less pulp, orange filter = lots of pulp. Drink within 24 hours.",
   site=dict(key="juice",data="/data/juice.json",pantry="",haveNote="Tap everything in your fridge and fruit bowl.",
     focus=[["all","Anything"],["healthy","🌿 Low sugar"],["kids","🧒 Kids"]],haveColor="green",favColor="fruit")),
}
for d,v in P.items():
    h=T
    for k,val in v.items():
        if k=="site": val=json.dumps(val,ensure_ascii=False)
        h=h.replace("{{"+k+"}}",val)
    h=h.replace('{{cdnAttr}}',(' data-cdn="'+v['heroCdn']+'"') if v['heroCdn'] else '')
    open(f"{d}/index.html","w").write(h)
    print(d)
