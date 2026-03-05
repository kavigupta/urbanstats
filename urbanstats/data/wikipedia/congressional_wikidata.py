import us
from attr import dataclass

from urbanstats.data.wikipedia.wikidata import fetch_sparql_as_list, query_sparlql
from urbanstats.data.wikipedia.wikidata_sourcer import WikidataSourcer


@dataclass
class CongressionalDistrictWikidataSourcer(WikidataSourcer):
    version: int = 3

    def columns(self) -> list[str]:
        return ["shortname"]

    def special_case(self, shortname: str) -> str | None:
        return {"WI-AL": "Q8027336"}.get(shortname)

    # pylint: disable=arguments-differ
    def compute_wikidata(self, *args: str) -> str | None:
        (shortname,) = args
        shortname = shortname.split(" ")[0]  # remove date
        state, district = shortname.split("-")
        special_case = self.special_case(shortname)
        if special_case:
            return special_case
        if district == "NA":
            return None
        ocd = f"ocd-division/country:us/state:{state.lower()}/cd:{int(district) if district != 'AL' else 'at-large'}"
        direct_query = query_sparlql("wdt:P8651", ocd)
        if direct_query:
            return direct_query
        name = self.wikidata_name(state, district)
        print(name)
        for qname in name, name.replace("district", "seat"):
            query = fetch_sparql_as_list(
                f"""SELECT ?item WHERE {{ ?item rdfs:label "{qname}"@en.}}"""
            )
            if query:
                [item] = query
                return item
        raise ValueError(f"Could not find wikidata for {shortname}")

    def wikidata_name(self, state: str, district: str) -> str:
        state_name = us.states.lookup(state).name

        apostrophe_state_name = state_name + "'s"

        # e.g., California's 1st congressional district
        if district == "AL":
            return f"{apostrophe_state_name} at-large congressional district"

        district_num = int(district)

        suffix = {1: "st", 2: "nd", 3: "rd"}.get(district_num % 10, "th")
        if district_num % 100 in (11, 12, 13):
            suffix = "th"
        return f"{apostrophe_state_name} {district_num}{suffix} congressional district"
