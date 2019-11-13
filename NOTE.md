## Git setting up commands
``` bash
git init
git remote add origin git@github.com:omasakun/amexcell-lang.git
git remote set-url origin --add git@gitlab.com:omasakun/amexcell-lang.git

# .gitattributes で設定したファイルをmerge対象から外す
git config merge.ours.driver true 

# git nffm ...
git config alias.nffm "merge --no-ff"
git config alias.sqm "merge --squash"

git push -u origin master
```

## Jest commands
```
# Enter interactive snapshot mode
pnpm test -- --watch
```
