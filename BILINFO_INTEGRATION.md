# Bilinfo API Integration

## Oversigt
Integration med Bilinfo API til at hente forhandlerdata og antal biler på Bilbasen.

## Setup (Første gang)

### 1. Setup API Credentials
1. Gå til menu: **Cheat Sheet MVP** → **🚗 Bilinfo API** → **Setup API Credentials**
2. Indtast credentials:
   - **Username**: `autounclefull`
   - **Password**: `eR3ia9sXzJb3PMg`
   - **Subscription Key**: `e9069e7deb2f48a2a34dde4ad2973e61`

### 2. Opret Bilinfo Data Ark
1. Gå til menu: **Cheat Sheet MVP** → **🚗 Bilinfo API** → **Opret Bilinfo Ark**
2. Dette opretter et nyt ark kaldet "Bilinfo Data" med følgende kolonner:
   - Domain
   - DealerName
   - DealerGuid
   - Website
   - Antal Biler
   - Sidst Opdateret

### 3. Test API Connection
1. Gå til menu: **Cheat Sheet MVP** → **🚗 Bilinfo API** → **Test API Connection**
2. Verificer at forbindelsen virker

## Brug

### Sync Forhandler Data
1. Gå til menu: **Cheat Sheet MVP** → **🚗 Bilinfo API** → **Sync Forhandler Data**
2. Data hentes fra Bilinfo API (sidste 7 dage)
3. Arket opdateres med alle forhandlere og deres bilantal

**Vigtigt**: Sync tager 10-30 sekunder da API'et er langsomt.

## Matching med Leads Ark

### Metode 1: VLOOKUP
I dit "Leads" ark kan du tilføje en kolonne der henter antal biler:

```
=IFERROR(VLOOKUP(B2,'Bilinfo Data'!A:E,5,FALSE),"")
```

Hvor:
- `B2` er din Domain kolonne i Leads arket
- `'Bilinfo Data'!A:E` er data området i Bilinfo Data arket
- `5` er kolonne nummer for "Antal Biler"

### Metode 2: INDEX/MATCH (mere fleksibel)
```
=IFERROR(INDEX('Bilinfo Data'!E:E,MATCH(B2,'Bilinfo Data'!A:A,0)),"")
```

## Data Struktur

### Bilinfo Data Ark
| Domain | DealerName | DealerGuid | Website | Antal Biler | Sidst Opdateret |
|--------|------------|------------|---------|-------------|-----------------|
| lindholmbiler.dk | Lindholm Biler A/S - Viborg | b52671b5-... | https://lindholmbiler.dk/ | 393 | 2026-02-04 12:30 |

### API Details
- **Endpoint**: `https://publicapi.bilinfo.net/listingapi/api/export`
- **Parameter**: `sinceDays=7` (henter forhandlere med biler opdateret sidste 7 dage)
- **Antal forhandlere**: Ca. 900-1000 (afhænger af aktivitet)

## Tips

### Opdatering
- Kør sync ugentligt for at holde data opdateret
- Brug `sinceDays=7` for god dækning uden at hente alle 56,991 biler

### Domain Matching
- Domain'er er automatisk normaliseret (www. fjernes)
- Match er case-insensitive
- Hvis en forhandler ikke findes, prøv at tjekke deres website URL

### Performance
- API kald bruger 6 MB execution quota per sync
- Sync tager typisk 15-25 sekunder
- Data gemmes i sheet, så ingen API kald ved lookup

## Fejlfinding

### "API credentials ikke sat op"
→ Kør "Setup API Credentials" først

### "Arket Bilinfo Data findes ikke"
→ Kør "Opret Bilinfo Ark" først

### "Ingen forhandlere hentet"
→ Test API connection først
→ Tjek internet forbindelse
→ Tjek at credentials er korrekte

### Domain matcher ikke
→ Sammenlign domain i begge ark
→ Tjek at URL'er er korrekt formateret
→ Nogle forhandlere har måske ikke website i Bilinfo

## Fremtidige Features
- [ ] Hent detaljerede bildata for specifik forhandler
- [ ] Automatisk sync via trigger (dagligt/ugentligt)
- [ ] Export af bildata til eget ark
- [ ] Prisanalyse og statistik per forhandler
