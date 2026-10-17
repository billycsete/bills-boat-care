# Content Outline

An outline of the content on the single-page site (`src/pages/index.astro`), in the order it appears. Contact details live in `src/data/site.ts`.

## Page metadata

- **Title:** Bill's Boat Care
- **Description:** Maintenance and management of sail and power boats from 30 to 60 feet in the Santa Barbara, CA area.
- **Favicon:** sailboat logo

## 1. Header (`SiteHeader`)

- **Logo + name:** Bill's Boat Care

## 2. Hero (`Hero`)


- **Heading (H1):** Your boat, ready for the *next adventure.*
- **Body:** Hands-on maintenance and management for sail and power boats in the Santa Barbara area, so whenever you're ready to go, the boat is too.
- **Buttons:** Call 805-245-0356 (tel), Email me (mailto)
- **Facts row (under buttons, with icons):** Sail & power · 30 to 60 feet · Santa Barbara, CA
- **Photos:** a client's boat on the water (large); work in progress (small, overlapping)

## 3. Intro (`Intro`)

- **Photo:** Bill on the dock, captioned "Bill, on the dock"
- **Heading (H2):** The jobs too small for a vendor, and too tedious for your Saturday.
- **Body:** I take on the tasks owners don't care to do, don't have time for, or that are too minor for vendors to bother with. The goal is simple: your boat is always ready to take wherever the next adventure might be.
- **Body:** For larger jobs, I bring in the best of the local vendors in Santa Barbara and Ventura.

## 4. Services (`Services`)

**Heading (H2):** What I can take off your hands

| Category              | Service                                                                                        |
|-----------------------|------------------------------------------------------------------------------------------------|
| Routine maintenance   | Management of regular engine and generator maintenance                                         |
| Routine maintenance   | Outboard and dinghy maintenance                                                                |
| Routine maintenance   | Fueling                                                                                        |
| Routine maintenance   | Holding tank emptying                                                                          |
| Routine maintenance   | Regular checking of thru-hulls, bilge pumps, fluid levels, filters, strainers, etc             |
| Routine maintenance   | Pre and post trip boat checks                                                                  |
| Repairs & projects    | Light repairs of fiberglass, electronics, plumbing, wood work and rigging                      |
| Repairs & projects    | Working with local vendors on large projects for electronics, rigging, stainless, brightwork and cleaning |
| Repairs & projects    | Work with local boat yards (Santa Barbara and Ventura) to ensure successful haul outs          |
| Deliveries            | Available for delivery service on the US west coast                                            |
| Deliveries            | Available as crew for deliveries world wide                                                    |

## 5. Credentials (`Credentials`)

- Licensed in the city of Santa Barbara
- Referrals available upon request
- Trusted local vendors in Santa Barbara and Ventura

## 6. Photos (`Gallery`)

- **Heading (H2):** From the logbook
- **Body:** A few snapshots from around the harbor.
- **Photos (captions):** Engine day, Haul out, Brightwork, Delivery up the coast

> All photos are placeholders until real images are added (`src` prop on `PhotoSlot`).

## 7. Quote (`Quote`)

> "There is nothing half so much worth doing as simply messing about in boats."
> — Kenneth Grahame, *The Wind in the Willows*

## 8. Footer (`Footer`)

- **Visual:** interactive WebGL ocean (three wave layers; pointer and touch push the water), with static waves as a fallback
- **Name:** Bill's Boat Care
- **Location:** Santa Barbara, CA
- **Links:** 805-245-0356 (tel), billsboatcare@outlook.com (mailto)
- **Copyright:** © {build year} Bill's Boat Care LLC · Licensed in the city of Santa Barbara

## Mobile call bar (`MobileCallBar`)

Fixed to the bottom of the screen on phones: Call and Email buttons.
