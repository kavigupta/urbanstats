import pandas as pd

table = pd.read_csv("output/taylor_metropolitan_clusters.csv")
grouped = table[["pop", "source"]].groupby("source")

pop, count = grouped["pop"].sum(), grouped["pop"].count()

print(pop.index)

sources = [
    "OSM",
    "Geonames",
    "Wikidata",
    "Manual Override",
    "Coordinates (with geonames backup)",
    "Coordinates (no geonames backup)",
]

assert set(pop.index) == set(sources)

for source in sources:
    print(f"Source: {source}")
    print(f"Population: {pop[source]/1e6:.2f}m")
    print(f"Percentage of Total Population: {pop[source]/pop.sum():.2%}")
    print(f"Count: {count[source]}")
    print(f"Percentage of Total Count: {count[source]/count.sum():.2%}")
    print(f"Average Population: {pop[source]/count[source]/1000:.0f}k")
    print()

# print(table[table.name.apply(lambda x: " township" in x.lower())])