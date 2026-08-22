# Claimed identity and positive references

- Review date: 2026-08-22
- Scope: Stage 3 deterministic identity extraction and Latvian bank registry

## Primary research

- [Phishpedia (USENIX Security 2021)](https://www.usenix.org/conference/usenixsecurity21/presentation/lin)
  separates phishing identification into finding an identity logo and matching
  it against a legitimate brand reference. Its explainable brand/domain framing
  supports OriginLens's positive-reference comparison, but OriginLens does not
  adopt screenshots, OCR, or its deep-learning models in Stage 3.
- [PhishIntention (USENIX Security 2022)](https://www.usenix.org/system/files/sec22-liu-ruofan.pdf)
  combines brand intention with credential-taking intention and interaction.
  OriginLens adopts the separation of identity and sensitive intent, but keeps
  both deterministic, local, non-interactive, and value-free at this stage.
- [DynaPhish (USENIX Security 2023)](https://www.usenix.org/system/files/usenixsecurity23-liu-ruofan.pdf)
  documents the coverage and aging limits of static reference lists. OriginLens
  responds with an explicit registry version, verification and re-verification
  dates, and an `unknown`/not-applicable outcome for identities outside its
  local registry. It does not perform popularity lookup, search, dynamic
  expansion, or remote interaction.

These systems report experimental results for their own datasets and threat
models. OriginLens does not reuse their accuracy claims.

## Authoritative Latvian bank evidence

- [Latvijas Banka's participant list](https://www.bank.lv/darbibas-jomas/monetaras-politikas-istenosana/vertspapiru-un-nodrosinajuma-sistema)
  supplies the reviewed legal names for the initial five institutions.
- [Swedbank domain guidance](https://www.swedbank.lv/business/useful/useful/internetbank?language=ENG)
  identifies `swedbank.lv` for Internet Bank entry. Its
  [governance page](https://www.swedbank.lv/about/governance?language=ENG)
  documents the Latvian bank's parent relationships.
- [SEB's March 2026 domain notice](https://www.seb.lv/info/pazinojumi/mainas-seb-bankas-logo-majaslapa-un-internetbanka)
  identifies `seb.lv` and `login.seb.lv`, and documents `ibanka.lv` as a
  redirect to the login domain.
- [Citadele financial-safety guidance](https://www.citadele.lv/en/useful/security/)
  identifies `citadele.lv` and `online.citadele.lv` and gives examples of
  domains that must not be trusted as Citadele.
- [Luminor's Internet Bank address notice](https://www.luminor.lv/lv/jaunumi/izmainas-luminor-internetbankas-adrese)
  identifies `luminor.lv` and `ib.luminor.lv` and documents retirement of the
  old DNB address.
- [Rietumu's official Internet Bank page](https://www.rietumu.com/lv/person/accounts/remote/onpc/irietumu)
  directly links the `i.rietumu.lv` login and identifies the iRietumu service.

Search-result snippets were used only to locate these sources. Registry records
are based on the authoritative pages themselves and retain their source URLs.

## OriginLens design implications

- The content script inspects only bounded title, heading, metadata, favicon,
  accessible-image, high-salience, footer/legal, and login-related text.
- Only known registry IDs, confidence levels, contexts, counts, and stable
  evidence codes cross the isolated-world message boundary; raw page strings do
  not.
- A single token is weak. Strong identity requires credential intent or more
  than one independent surface. Multiple organizations and non-credential
  article, comparison, documentation, customer-logo, payment, and OAuth/SSO
  contexts remain weak.
- Context labels cannot suppress a page that requests password or OTP input,
  because attackers control page text and structure.
- Stage 3 reports verified relationships and strong mismatches as inspectable
  facts. Warning and blocking policy remains Stage 4 work.
