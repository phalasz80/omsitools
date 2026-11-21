# OMSI Tools: közzététel a tools.regionalbahn.hu/omsitools/ címen

## Miért 404 jelenleg?

Az egyéni domain a `phalasz80/rbtools` GitHub Pages oldalhoz tartozik. Az `/omsitools/` URL csak akkor él, amikor ebben a repóban létezik `omsitools/index.html` és a hozzá tartozó öt webes fájl. A külön `phalasz80/omsitools` forrásrepo létrehozása **önmagában nem állítja helyre a 404-et**: a közzétételi másolásnak is sikerülnie kell.

## Egyszeri beállítás

1. Nyisd meg a https://github.com/new oldalt. Repository name: `omsitools`, owner: `phalasz80`; válaszd a Public beállítást és hozd létre.
2. Csomagold ki az `OMSI_Tools_GitHub_upload_v1.0.1.zip` csomagot; az `index.html`, `app.mjs`, `engine.mjs`, `traffic.mjs`, `style.css` stb. közvetlenül a repo **gyökérmappájába** kerüljenek. A rejtett `.github/workflows/deploy-to-rbtools.yml` fájlt is töltsd fel. GitHub → Add file → Upload files → Commit changes. (A GitHub webböngésző nem bontja ki az egyszerűen feltöltött ZIP-et.)
3. Hozz létre egy fine-grained GitHub Personal Access Tokent a https://github.com/settings/personal-access-tokens/new címen. Resource owner: `phalasz80`; Repository access: Only select repositories → `rbtools`; Permissions → Repository permissions → Contents: Read and write. Válassz megfelelő lejáratot. A tokent ne küldd el senkinek és ne tedd a kódba.
4. Az `omsitools` repó → Settings → Secrets and variables → Actions → New repository secret: Name: `RBTOOLS_DEPLOY_TOKEN`; Secret: a token.
5. Az `omsitools` repó → Actions → `Test and publish OMSI Tools to RegionalBahn` → Run workflow, `main` ág. A futásban a `tests` és a `publish` jobnak is sikeresnek kell lennie.
6. Ezután a GitHub Pages frissülésével a https://tools.regionalbahn.hu/omsitools/ címen megjelenik az alkalmazás. Ha az rbtools Pages oldala másik ágból vagy mappából épül, a kiadási célt hozzá kell igazítani.

## Biztonsági és technikai megjegyzések

- A `rbtools/index.html` és a `rbtools/CNAME` állományt a közzétevő nem módosítja.
- A GitHub Actions kizárólag az `rbtools/omsitools/` mappájába másol.
- A közvetlen URL-es elérés nem jelent belépéshez kötött védelmet; a tartalom nyilvános.
- A kapcsolódó GitHub-hozzáférés nélkül új repozitóriumot és tokent a ChatGPT nem hozhat létre helyetted. Ha az `omsitools` repó és a forrásfájlok már elérhetők az összekapcsolt GitHub-fiókban, a meglevő `rbtools` írási jogosultságával külön is kezdeményezhető a célmappába történő telepítés, token kiadása nélkül.
