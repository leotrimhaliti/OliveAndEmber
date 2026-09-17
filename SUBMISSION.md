# Submission description

Olive & Ember is a food ordering application built with Laravel, React, and a MySQL-targeted relational schema. Customers can register, browse food by category, maintain a persistent cart, place delivery orders, and view their personal order history. An invitation-protected administrator account manages products, availability, category assignments, and order statuses.

The implementation uses Sanctum session authentication, backend role and ownership checks, validated requests, and consistent JSON errors. Checkout calculates integer-cent totals from database prices inside a transaction and stores purchased names and prices as historical snapshots. The responsive interface includes loading, empty, validation, and error states. Migrations, demo data, focused automated tests, setup instructions, and an AI assistance record are included.

The scope is deliberately small: one restaurant, payment on delivery, and manual order-status refresh. This keeps the code understandable and leaves time to verify the important business rules. See VERIFICATION.md for the exact evidence and remaining checks.

# Publishing checklist

- [ ] Read the code and explain the checkout transaction, price snapshots, Sanctum cookies/CSRF, and ownership checks in your own words.
- [ ] Use PHP 8.4+; check `php -v`, `composer --version`, and `node --version`.
- [ ] Run the documented setup on a clean clone using **MySQL 8.4**.
- [ ] Run `php artisan test`, `php vendor/bin/pint --test`, `npm test`, and `npm run build`.
- [ ] Sign in as both demo users and walk through the manual verification checklist.
- [ ] Save/export this complete AI conversation, including the original prompt and responses, in the employer's accepted format. Review it for real secrets; disclose any necessary redactions. Do not invent missing exchanges.
- [ ] Inspect `git status --short` and `git diff --cached`. Never commit `.env`, `.tools`, database files, logs, `vendor`, or `node_modules`.
- [ ] Commit the source, tests, both lockfiles, and documentation. Suggested milestones are in README.md.
- [ ] Create an empty repository in GitHub or GitLab with the visibility the employer requires. Do not add an extra generated README/license on the remote.
- [ ] Push using the following commands after replacing the example remote URL:

```sh
git add .
git diff --cached --stat
git status --short
git commit -m "feat: implement Olive and Ember food ordering app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

If a remote already exists, inspect it with `git remote -v` and use it instead of adding another. GitLab uses its equivalent repository URL.

- [ ] On GitHub, wait for both jobs in `Application checks` to pass. On GitLab, run the commands locally or translate the supplied GitHub Actions workflow to GitLab CI.
- [ ] Open the remote repository and verify README links, lockfiles, code, and test files are present.
- [ ] Submit the repository URL, the description above, demo credentials, and the **actual conversation export**. AI_USAGE.md is additional context only.

# Suggested short demo

1. Filter the menu to Pizza, add a product, change quantity, and refresh to show persistence.
2. Sign in as the customer, complete checkout, and show the saved delivery details and price breakdown.
3. Sign in as the administrator, edit availability, and change the new order to preparing.
4. Sign back in as the customer and refresh the order status.
5. Show the authorization/checkout tests and explain why submitted prices cannot change the total.
