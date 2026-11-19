# Licences, data sources and attribution

Everything on the map is built from open data. No Google, Apple, Bing or other proprietary map content
(imagery, 3D tiles, geometry) is used, not even as a reference.

## This repository

| What | Licence |
|---|---|
| Source code (`pipeline/`, `web/`, scripts) | [MIT](LICENSE) |
| Map imagery (published tiles), `video/`, `pipeline/style/` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) by Dmytro Krasun, **plus the data credits below**, which must be kept with any copy |

The imagery and videos are *Produced Works* under the ODbL (see OpenStreetMap below): their own licence is
free to choose, but the OpenStreetMap notice must stay with them. AI-painted images may not be protected by
copyright everywhere; where they are, CC BY 4.0 applies.

## Credit line

Shown on the map (footer), in video mode and on every clip; use it on reposts, captions and end cards:

> Map data © OpenStreetMap contributors · Tel Aviv-Yafo Municipality · Terrain: Copernicus DEM © DLR, Airbus DS · Painted with AI

Stuttgart (region `stuttgart`, rendered procedurally, not painted):

> Map data © OpenStreetMap contributors · Datenquelle: LGL, www.lgl-bw.de, dl-de/by-2-0 (verändert) · Terrain: LGL DGM1, Copernicus DEM © DLR, Airbus DS

Each region lists its own credit lines in `pipeline/src/places.ts` (`credits`).

## Data sources

| Source | Used for | Licence | Obligations |
|---|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright) (via the Overpass API) | ground (roads, pavements, parks, beach, coastline, water, rail, landuse), buildings outside Tel Aviv-Yafo, municipal borders, roads for the traffic animation, rail routes and tracks for the trains | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) | "© OpenStreetMap contributors" visible with the map and videos. Map images and videos are Produced Works (no share-alike on them). The data the pipeline derives by joining OSM with other data is a Derivative Database: it is not redistributed, and `pipeline/` (this repository) is the published method to recreate it. |
| [Tel Aviv-Yafo Municipality GIS](https://opendatasource.tel-aviv.gov.il/) (layer 513 buildings, layer 574 tree canopy 2024) | building footprints and surveyed heights, trees in Tel Aviv-Yafo | Municipal open-data terms (the Hebrew text is binding) | Cite the source. |
| [Copernicus DEM GLO-30](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) (AWS Open Data) | terrain height | Copernicus DEM licence: free, including commercial use | "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved". |
| [LGL Baden-Württemberg Open GeoData](https://opengeodata.lgl-bw.de): LoD2 3D buildings (CityGML) | buildings with roof shapes in Stuttgart | [Datenlizenz Deutschland – Namensnennung 2.0](https://www.govdata.de/dl-de/by-2-0) (metadata record 3c42c386-5ba2-43e3-8e6d-2146fa99cdeb) | Credit "Datenquelle: LGL, www.lgl-bw.de, dl-de/by-2-0 (verändert)" with the map and videos: "(verändert)" is the change notice the licence requires for modified data (the map is a derived rendering). |
| LGL Open GeoData: DGM1 (1 m digital terrain model) | terrain height in Stuttgart (Copernicus outside Baden-Württemberg) | Datenlizenz Deutschland – Namensnennung 2.0 (the portal's terms: every Open GeoData product) | Same credit line. |
| LGL Open GeoData: nDOM1 (1 m normalised surface model) | tree crown positions, sizes and heights in Stuttgart (no open city tree inventory exists) | Datenlizenz Deutschland – Namensnennung 2.0 | Same credit line. |
| Wikimedia Commons photos [Fernsehturm_stuttgart.jpg](https://commons.wikimedia.org/wiki/File:Fernsehturm_stuttgart.jpg) (Alexander Blum, [CC BY-SA 2.0 DE](https://creativecommons.org/licenses/by-sa/2.0/de/)) and [Turm_Stuttgart_Hauptbahnhof_2010-06-28_(1).jpg](https://commons.wikimedia.org/wiki/File:Turm_Stuttgart_Hauptbahnhof_2010-06-28_%281%29.jpg) (Harke, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)) | looked at for proportions and colours of the hand-built Fernsehturm and Mercedes star models (`pipeline/src/landmarks.ts`); dimensions from de.wikipedia and OSM building:parts. No pixels are used. | CC BY-SA | Credited here; the photos are not copied, traced or redistributed. |
| Wikimedia Commons photos [Stuttgart_-_Keplerstraße_7.jpg](https://commons.wikimedia.org/wiki/File:Stuttgart_-_Keplerstra%C3%9Fe_7.jpg) (Zinnmann, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)), [Ehemalige_Trikotagenfabrik_Wilhelm_Benger_.jpg](https://commons.wikimedia.org/wiki/File:Ehemalige_Trikotagenfabrik_Wilhelm_Benger_.jpg) (A-H TSB, CC BY-SA 4.0), [Landappbw_1058706_1817_Villen_in_Heslach_Stuttgart.jpg](https://commons.wikimedia.org/wiki/File:Landappbw_1058706_1817_Villen_in_Heslach_Stuttgart.jpg) (Martin Hahn, [CC0](https://creativecommons.org/publicdomain/zero/1.0/)), [Killesberg-pjt1.jpg](https://commons.wikimedia.org/wiki/File:Killesberg-pjt1.jpg) (Pjt56, CC BY-SA 4.0), [Aerial_image_of_the_Pattonville_airfield_(view_from_the_west).jpg](https://commons.wikimedia.org/wiki/File:Aerial_image_of_the_Pattonville_airfield_(view_from_the_west).jpg) (Carsten Steger, CC BY-SA 4.0) | looked at as a vocabulary of façade details (window sizes and groupings, frames, shutters, sills, string courses, shop fronts) for the procedural façade shader (`pipeline/page/renderer.ts`), and for the asphalt and grass runways of EDTQ Pattonville. No pixels are used. | CC BY-SA / CC0 | Credited here; the photos are not copied, traced or redistributed. |
| Wikimedia Commons photos [15-01-18-Stuttgart-RalfR-DSCF1096-19_retusche.jpg](https://commons.wikimedia.org/wiki/File:15-01-18-Stuttgart-RalfR-DSCF1096-19_retusche.jpg) (Ralf Roletschek, [GFDL 1.2](https://www.gnu.org/licenses/old-licenses/fdl-1.2.html)), [Koenigsbau_Stuttgart_20060901.jpg](https://commons.wikimedia.org/wiki/File:Koenigsbau_Stuttgart_20060901.jpg) (Rosenzweig, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)) and [StuttgartSchloss2018-05-08-15-06-56_(cropped).jpg](https://commons.wikimedia.org/wiki/File:StuttgartSchloss2018-05-08-15-06-56_(cropped).jpg) (Rolf Kickuth, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)) | looked at for the Königsbau colonnade (column count, height, depth), the materials of the Königsbau, Neues Schloss and Altes Schloss, the crown on the Schloss dome and the Jubiläumssäule (`pipeline/src/landmarks.ts` `LOOKS`, `ARCADES`, `TOPS`, `TOWERS`; the column’s height from OSM). No pixels are used. | GFDL / CC BY-SA | Credited here; the photos are not copied, traced or redistributed. |
| Wikimedia Commons photos [Stadtbahn_Stuttgart_Nordbahnhofstraße_U15_3503.JPG](https://commons.wikimedia.org/wiki/File:Stadtbahn_Stuttgart_Nordbahnhofstra%C3%9Fe_U15_3503.JPG) (Joma2411, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)) and [Mühldorf,_Doppelstock-RB-42_nach_Burghausen,_1.jpeg](https://commons.wikimedia.org/wiki/File:M%C3%BChldorf,_Doppelstock-RB-42_nach_Burghausen,_1.jpeg) (Renardo la vulpo, [CC0](https://creativecommons.org/publicdomain/zero/1.0/)) | looked at for the liveries of the animated trains (`web/src/scripts/trains.ts`): the SSB DT 8 Stadtbahn and DB double-deck regional coaches. No pixels are used. | CC BY-SA / CC0 | Credited here; the photos are not copied, traced or redistributed. |
| Wikimedia Commons photos [Neckarbruecke_(Stuttgart_21)_1X7A0049.jpg](https://commons.wikimedia.org/wiki/File:Neckarbruecke_(Stuttgart_21)_1X7A0049.jpg) and [Rosensteintunnel_(2021)_1X7A0042.jpg](https://commons.wikimedia.org/wiki/File:Rosensteintunnel_(2021)_1X7A0042.jpg) (Alexander Migl, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)), [Stuttgart_Koenig-Karls-Bruecke_Stuttgart.jpg](https://commons.wikimedia.org/wiki/File:Stuttgart_Koenig-Karls-Bruecke_Stuttgart.jpg) (MSeses, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) / GFDL) and [Schwabtunnel-8_Westportal_Figurengruppe.jpg](https://commons.wikimedia.org/wiki/File:Schwabtunnel-8_Westportal_Figurengruppe.jpg) (Vux, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)) | looked at for proportions and colours of the hand-built tunnel portals and bridges (`pipeline/src/portals.ts`, `pipeline/src/bridgemodels.ts`): the S21 Neckarbrücke, the Rosensteintunnel portals, the König-Karls-Brücke and the Schwabtunnel west portal; dimensions from de.wikipedia and OSM. No pixels are used. | CC BY-SA / GFDL | Credited here; the photos are not copied, traced or redistributed. |

None of this data is in the repository: `npm run fetch` downloads it into `data/` (ignored by git).

## AI painting

Render tiles are repainted by OpenAI's image model through the Codex CLI (ChatGPT account). OpenAI's terms
assign the output rights to the user. No credit is required; the map and clips say "Painted with AI" because
social platforms ask for AI-generated content to be labelled.

Everything in `pipeline/style/` was painted the same way for this project: `reference.png` (the house style,
a stretch of the painted Tel Aviv map: Gordon beach and the city behind it), `trees.png` (tree species
sheet), `trees-stuttgart.png` (Stuttgart tree species sheet, derived from `trees.png` with Codex/ChatGPT)
and `sea.png` (sea texture).

## Bologna geographic foundation (BO-001)

The `bologna` baseline is procedural: OpenStreetMap buildings, trees and ground features (ODbL),
and Copernicus DEM GLO-30 terrain, under the terms and exact Copernicus credit above. Its credit is:

> Map data © OpenStreetMap contributors · Terrain: Copernicus DEM © DLR, Airbus DS

Municipal datasets first downloaded for the BO-001 audit; BO-002 activates them in the isolated
procedural experiments described below (the published map and OSM-only baselines are unchanged):

| Source | Use | Licence and obligations |
|---|---|---|
| Comune di Bologna – Sistema Informativo Territoriale (SIT), [CTC – Edifici volumetrici](https://opendata.comune.bologna.it/explore/dataset/c_a944ctc_edifici_pl/) | Audit and BO-002 building footprints/relative eave heights | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): credit publisher, link source and licence, indicate modifications; retain supplied notices. Projection, filtering, overlap reconciliation and extrusion are adaptations; original exports are retained locally. |
| Comune di Bologna – Settore Ambiente e Verde, [Alberi in manutenzione](https://opendata.comune.bologna.it/explore/dataset/alberi-manutenzioni/) | Audit and BO-002 generic class-estimated tree crowns | CC BY 4.0, same obligations; projection, filtering, class estimates and spatial deduplication are adaptations. |
| NGA EGM2008 via [GeographicLib GeoidEval](https://geographiclib.sourceforge.io/cgi-bin/GeoidEval) | Bologna origin geoid undulation, 39.647 m | EGM2008 is public-domain US government data; GeographicLib is MIT/X11. No imagery or remote geometry used. |

Before municipal geometry is used on a map, add its publisher/licence to Bologna's region credits,
render manifest and linked footer. See [the reproducible audit](docs/bologna-data-audit.md).

BO-001R acquires the same OpenStreetMap data via the [Geofabrik Nord-Est dated PBF extract](https://download.geofabrik.de/europe/italy/nord-est.html)
(`nord-est-261117.osm.pbf`), under ODbL 1.0. It is a distribution of OSM, not an additional
geographic source: existing OSM region credits and footer copyright/licence link apply.
The extract is clipped with whole ways and complete surface relations; selection, decoding and
rendering are adaptations. [Coverage provenance and validation](docs/bologna-coverage-fix.md)
record the URL, download date, checksums, tool commands and source categories. No Geofabrik
imagery is used; no municipal geometry is added.

BO-002 activates the audited CTC dataset in a separate procedural experiment (`data/bo-002-buildings/`).
Credit: **Comune di Bologna – SIT, CTC Edifici volumetrici, CC BY 4.0; projected, filtered,
overlap-reconciled and extruded**. Dataset and licence links are given above, in conditional Bologna
source credits, generated manifests/proofs and viewer/footer/video notices. Relative eave heights
are used; absolute CTC elevations are not used. The separate accepted municipal trees experiment (`data/bo-002-trees/`)
uses **Comune di Bologna – Settore Ambiente e Verde, Alberi in manutenzione, CC BY 4.0;
projected, filtered, class-based height/radius estimates and spatial deduplication**.
The original OSM-only baseline remains selectable and unchanged. See
[the implementation and validation](docs/bologna-municipal-implementation.md).

BO-003 reuses those same pinned OSM, CTC, tree and terrain snapshots in an isolated
architectural pilot (`data/bo-003-architecture/`). Roof topology, terracotta/brick/plaster
palette, bounded ridge uplift and portico column spacing/clearance are **procedural estimates**,
not surveyed municipal attributes. Existing source credits and modification notices remain
on every proof and in the manifest. Plain BO-001R/BO-002 modes remain unchanged.
The [architecture audit](docs/bologna-architecture-audit.md) also consults the Ministry of
Culture / ICCD [Palazzo d'Accursio metadata](https://catalogo.beniculturali.it/detail/ArchitecturalOrLandscapeHeritage/0800262039)
(CC BY 4.0 metadata) for identity only; no photographs, attached images or models are used.
Official basilica text and historical repository descriptions are factual audit references,
not imported imagery or geometry. No additional geographic dataset or image source is activated.

BO-003F retains those geographic sources and adds a separately labelled **appearance-only**
roof topology proposal on four verified church partitions. Reference photographs are
[Zairon, roof view (2022)](https://commons.wikimedia.org/wiki/File:Bologna_Torre_degli_Asinelli_Vista_su_Basilica_di_San_Petronio_2.jpg),
[Congolandia.g, facade (2019)](https://commons.wikimedia.org/wiki/File:Basilica_di_San_Petronio,_facciata.jpg),
and [Raffacossa, clock tower (2017)](https://commons.wikimedia.org/wiki/File:Torre_dell%27Orologio_(Bologna).jpg),
all [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (the CC option is selected
for the dual-licensed clock photo). Originals, licence provenance and checksums are retained
locally, under their original licences. Photos are inspected for appearance; no pixels,
tracing, texture or photogrammetric measurements enter the map or proof images. Only the roof
view informs the estimated shed topology; facade/clock photos are audit references and neither
feature receives a new metric mesh. New roof rise/pitch remain explicit estimates above the
unchanged municipal eaves. Credit lines are conditional on BO-003F in region source metadata,
manifests/proofs, video notices and linked footer; existing modes keep their original credits.
The official basilica, ICCD, government tourism guide and tower operator safety document are
factual audit references only, not imported image/model assets. See
[the source and fidelity audit](docs/bologna-landmark-fidelity-audit.md).

## Software

Polygon-clipping (MIT, [source](https://github.com/mfogel/polygon-clipping)) performs planar
polygon intersection/difference for this adapter; installed via npm, not a geographical source.

[three.js](https://threejs.org) (MIT), [OpenSeadragon](https://openseadragon.github.io) (BSD-3-Clause),
[Astro](https://astro.build) (MIT), [sharp](https://sharp.pixelplumbing.com) (Apache-2.0),
[Playwright](https://playwright.dev) (Apache-2.0), [esbuild](https://esbuild.github.io) (MIT),
[tsx](https://tsx.is) (MIT), [FFmpeg](https://ffmpeg.org) (LGPL/GPL, used as an external tool only),
[gifsicle](https://www.lcdf.org/gifsicle/) (GPL-2.0, external tool only). Installed from npm or the system package manager,
not vendored; their licences come with them.

This is not legal advice.
