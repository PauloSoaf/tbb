# Shopping Lists

The shopping list feature lets patients generate a grocery checklist from the active meal plan and lets the nutritionist monitor it from the dashboard.

## Data Model

- `ShoppingList` belongs to a nutritionist, patient, and optionally a meal plan.
- `ShoppingListItem` stores normalized name, category, quantity, unit, source, checked state, and ordering.
- Status values are `ACTIVE` and `ARCHIVED`.
- Item sources are `MEAL_PLAN`, `MANUAL`, and `SUBSTITUTION`.

## Generation

`generateShoppingListFromActivePlan` validates tenant ownership, loads the selected meal plan, archives the current active list, aggregates repeated foods by normalized name and unit, multiplies quantities by the selected period, and creates a new active list.

The core helpers live in:

- `src/lib/utils/food-normalization.ts`
- `src/lib/utils/shopping-list.ts`
- `src/validation/shopping-list.schema.ts`
- `src/services/shopping-list.service.ts`
- `src/actions/shopping-list.action.ts`

## Patient Portal

Route: `/portal/[tenant]/compras`

The patient can:

- generate a list from the active meal plan;
- choose 1, 3, 7, or 14 days;
- check and uncheck items;
- add, edit, and delete manual items;
- copy the list as plain text;
- print or archive the current list.

The portal navigation includes a `Compras` entry on desktop and mobile.

## Nutritionist Dashboard

Route: `/dashboard/[tenant]/pacientes/[patientId]/compras`

The nutritionist can view the patient's active or recent shopping lists, progress, category groups, quantities, and item source.

The patient record also includes a compact summary card linking to the full shopping list view.

## Security

All service functions require both `nutritionistId` and `patientId`. Portal actions take the patient identity from the patient session cookie. Dashboard reads take the nutritionist identity from the dashboard session.

## Limitations

- The current portal flow generates lists from active meal plans only.
- Copy formatting is plain text and currently uses Portuguese category labels.
- Reordering is implemented in the service layer but not yet exposed in the UI.
