# Sprint: Automatic Shopping Lists

## Goal

Add automatic shopping lists generated from meal plans, with portal checklist behavior and dashboard visibility.

## Implemented

- Prisma enums and models for shopping lists and items.
- Migration `20260629000000_add_shopping_lists`.
- Food normalization, category inference, unit normalization, aggregation, generation, and text formatting helpers.
- Zod validation for generation, list updates, item CRUD, and checked toggles.
- Service layer with tenant-safe generation, list reads, list update/archive/delete, item CRUD, toggle, text export, manual creation, and reorder support.
- Patient portal route `/portal/[tenant]/compras`.
- Portal components for generation, category groups, rows, manual item dialog, copy, empty state, and period selection.
- Patient portal desktop and mobile navigation link.
- Nutritionist dashboard route `/dashboard/[tenant]/pacientes/[patientId]/compras`.
- Summary card in the patient record.
- i18n namespace `shopping_list` in PT, EN, and ES.
- Unit tests for helpers and validation.

## Manual Test Checklist

1. Open the patient portal.
2. Confirm the `Compras` navigation entry appears.
3. Open `/portal/[tenant]/compras`.
4. Generate a list from the active meal plan.
5. Change the period and generate again.
6. Check and uncheck items.
7. Add a manual item.
8. Edit the manual item.
9. Delete the manual item.
10. Copy the list and confirm clipboard text.
11. Print the list.
12. Archive the list.
13. Open the patient dashboard record.
14. Confirm the shopping list summary card appears.
15. Open `/dashboard/[tenant]/pacientes/[patientId]/compras`.
16. Confirm categories, quantities, progress, and source labels.
17. Test light and dark themes.
18. Test mobile portal navigation.

## Verification Commands

```bash
npm run test
npx tsc --noEmit
npm run build
```

## Known Environment Notes

Previous full build attempts in this workspace were blocked by Prisma client file locking on Windows (`EPERM` when renaming `query_engine-windows.dll.node`). If that appears again, close any running Next/Prisma process and regenerate Prisma Client before retrying.
