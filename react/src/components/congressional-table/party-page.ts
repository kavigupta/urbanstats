import partyPages from '../../data/party_pages'

export type PartyPage = (typeof partyPages)[keyof typeof partyPages]

/**
 * Parties the data has no page for, of which Independent is one: representatives.csv names them
 * but party_pages.json lists only those with an article, so a lookup has to come up empty.
 */
export function getPartyPage(party: string | null | undefined): PartyPage | undefined {
    return party !== null && party !== undefined && party in partyPages
        ? partyPages[party as keyof typeof partyPages]
        : undefined
}
