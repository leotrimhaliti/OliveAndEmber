# Verification record

Performed during implementation on 2026-09-17 in the Windows workspace. This is an evidence log, not a claim that every possible scenario is covered.

## Automated checks actually run

| Check | Result |
| --- | --- |
| Laravel feature/unit suite, SQLite in memory | 14 tests passed, 90 assertions |
| Same suite, isolated `food_ordering_test` database on MariaDB 10.4.32 using the MySQL driver | 14 tests passed, 90 assertions |
| Laravel Pint | Passed |
| Node cart unit tests | 2 tests passed |
| React/Vite production build | Passed |
| Composer dependency installation/update advisory check | No security advisories reported |
| npm install audit | No vulnerabilities reported |
| Development migrations and seeding | Passed on local MariaDB |
| Pre-push staged secret and ignored-file scan | Passed; no live credential or ignored runtime file was committed |

The suite contains 12 application feature tests and two Laravel scaffold smoke tests. Fast tests disable CSRF as Laravel normally does; the live browser checks below exercised actual session cookies and CSRF-protected mutations.

## Live browser checks actually performed

- Loaded all 12 products and six categories from the Laravel API.
- Filtered to Pizza, added Burrata Margherita, and increased quantity to two.
- Reloaded the page and confirmed that the cart retained two items.
- Followed checkout as a guest and was redirected to login.
- Signed in using `customer@example.com`; returned to checkout with cart intact.
- Submitted demo delivery details. The resulting order contained two pizzas at $16.90 each, totaling $33.80; the cart cleared.
- Viewed order details, address, notes, and pending status.
- Signed out and signed in using `admin@example.com`.
- Opened product management, opened the cheesecake edit form, and successfully saved it.
- Opened the administrator order list and the new order details.
- Updated the order status to preparing and confirmed the saved status in the UI.
- Inspected the desktop menu and mobile menu/order details at a 390×844 viewport. The mobile menu document width and scroll width were equal (375 CSS pixels excluding the scrollbar), with no page-level horizontal overflow. Category navigation intentionally scrolls horizontally.

These actions created one extra local demo order in addition to the seed order. No real restaurant, payment, or delivery service is connected.

## Checks still to perform

- Run the documented installation on a clean clone with **MySQL 8.4**. Docker was not installed on the implementation machine, so the development and production Compose definitions are validated by CI rather than claimed as locally executed.
- Confirm the published GitHub Actions run passes all backend, frontend, and production-image jobs.
- Provision an actual staging host, HTTPS domain, and managed MySQL account using [DEPLOYMENT.md](DEPLOYMENT.md); these require the owner's provider account and credentials.
- Perform a full keyboard/screen-reader audit if accessibility is part of the employer's rubric. Labels, focus styles, semantic controls, live feedback, and native modal dialogs are present, but this is not a formal audit.
- Test other target browsers and real mobile devices. Responsive browser inspection is not equivalent to device testing.
- Have the candidate personally review the code, rerun the checks, and export the actual AI conversation.

## Practical manual regression checklist

1. Register a customer with a fresh email; verify login/logout and validation errors.
2. Attempt an invalid invitation, then register an administrator using the code configured privately in `.env`.
3. Browse each category, use search, and confirm an unavailable product cannot be added.
4. Add two products, change quantities, remove one, refresh, and check the total.
5. Complete checkout and compare the order items and total with the current catalog.
6. Log in as another customer and verify their history does not include the first customer's order.
7. As admin, add/edit/deactivate/delete a disposable product and assign a category.
8. Update an order through all five supported statuses; check the customer's refreshed view.
9. Edit a purchased product's name/price and verify the previous order keeps its original values.
10. Check empty carts/order histories, search with no results, a stopped API, and narrow-screen layouts.
