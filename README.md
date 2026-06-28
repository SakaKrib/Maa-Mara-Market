# MAA MARA ECOMMERCE

# Alerts
##### Currently, manually edit these files with proper IP address to use Vite:
`maa-mara-ecommerce/maamara_market_project/Admin-Dashbord/src/cmponents/Hooks/Order/CombinedOrderHook.jsx`
`maa-mara-ecommerce/maamara_market_project/Admin-Dashbord/src/cmponents/Hooks/ActivityHook/ActivityHook.jsx`

##### Put the .env with vite variables here:
`maa-mara-ecommerce/maamara_market_project/Admin-Dashbord/src/cmponents/Constant/`

# Collaboration Rules
##### 0. Document everything
Write long commit messages that explain EVERYTHING that was done in detail, and commit often. This takes time but will save more time by helping us stay current with each others' changes, rather than needing to look through what code changed with each commit every time. Try to make commits logically coherent.

##### 1. New dependencies = export pip environment
If any new dependencies are installed with `pip`, export the list of dependencies using `pip freeze > requirements.txt` and mention this in your commit message, including which packages were installed or upgraded. If `npm` is used to install anything new, commit the new `package.json` and `package-lock.json` and mention this in your commit message, including which packages were installed or upgraded.
