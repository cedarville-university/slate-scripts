# slate-scripts

JavaScript helpers for enhancing Slate forms with date/time controls, image previews, syntax highlighting, and question-level behavior. The source uses browser-native JavaScript modules; no build step is required.

## Where to put scripts in Slate

- **Label source:** Place the script here when it should run in both the read-only view and the editable form. This is useful for formatted dates, image previews, and highlighted code.
- **Edit Scripts/Styles:** Place the script here when it should run only in the editable form, such as generating a slug as someone types a title.

Add each initialization script once per form. Initialize after Slate has rendered the form and its questions. When Slate replaces a form dynamically, initialize the new form after it renders.

## Load the package

For a public GitHub repository, load the entry point through jsDelivr:

```text
https://cdn.jsdelivr.net/gh/cedarville-university/slate-scripts@v1.0.0/src/forms/index.js
```

Replace `v1.0.0` with a tag that has been published to GitHub. Pin a release tag in production, and update the URL when you want to adopt a newer release.

The examples below use dynamic `import()`, which works inside a regular script tag. If the Slate editor accepts JavaScript directly, use the contents of the script tag.

## Enhance a form

Place this in **label source** to enhance both view and edit modes. Replace `#your-form-id` with a selector for the actual HTML `<form>` element, and replace the question labels with your own.

```html
<script>
  import('https://cdn.jsdelivr.net/gh/cedarville-university/slate-scripts@v1.0.0/src/forms/index.js')
    .then(({ formControl, datepicker, imgpreview, codehighlighter }) => {
      formControl('#your-form-id')
        .question('Begin Date', ({ question }) => {
          datepicker(question.input)
            .addDefaultQuickActions()
            .make();
        })
        .question('Image', ({ question }) => {
          imgpreview(question.input)
            .addStyles(`
              img {
                display: block;
                max-width: 100%;
                margin-block-start: 0.5rem;
                border-radius: 0.25rem;
              }
            `)
            .make();
        })
        .question('Integration', ({ question }) => {
          codehighlighter(question.input, {
            language: 'javascript',
            collapsed: true,
          })
            .make()
            .addStyles(`
              [data-codehighlighter] { margin: 0; }
              code { white-space: pre-wrap; }
            `);
        });
    })
    .catch(console.error);
</script>
```

Question lookup uses the label's trimmed text and is case-sensitive. Use unique labels within a form. A missing question is skipped; a missing or invalid form throws an error.

| Helper | Editable form | Read-only view |
| --- | --- | --- |
| `datepicker` | Adds a native date/time input and optional quick-action buttons; keeps the original input for saving. | Formats the stored date/time or displays an empty placeholder. |
| `imgpreview` | Shows an image preview and updates it as the URL changes. | Shows a preview of the stored image URL. |
| `codehighlighter` | Leaves the input unchanged. | Displays the stored source as highlighted code, optionally collapsed. |

Mode detection uses the form action URL: `cmd=form_edit` and `cmd=widget` count as editing. Other values use view mode.

## Edit-only behavior

Place this in **Edit Scripts/Styles** to generate a slug while someone edits the title:

```html
<script>
  import('https://cdn.jsdelivr.net/gh/cedarville-university/slate-scripts@v1.0.0/src/forms/index.js')
    .then(({ formControl }) => {
      formControl('#your-form-id')
        .question('Title', ({ question: title, questions }) => {
          const slug = questions.get('Slug');
          if (!slug) return;

          title.on('input', () => {
            slug.input.value = title.input.value
              .toLowerCase()
              .trim()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/[\s-]+/g, '-')
              .replace(/^-+|-+$/g, '');
          });
        });
    })
    .catch(console.error);
</script>
```

## API notes

### `formControl(formSelector)`

Accepts a CSS selector or an `HTMLFormElement`. Its methods can be chained:

- `.question(label, callback)` calls the callback with `{ question, questions, isEditing }`. `questions` is a `Map` keyed by label, and `isEditing` is a boolean for the form.
- `.questions(callback)` supplies a collection whose `.style(styles, applyTo)` method styles all discovered questions.
- `.style(styles)` applies an inline style object to the form.
- `.addStyles(css)` appends CSS scoped to the form using `@scope`.

Each question exposes `question` (the question container), `label`, `input`, `.style(styles, applyTo = 'input')`, `.on(event, handler, options)`, and `.effect(callback)`. Style targets are `'input'`, `'label'`, and `'question'`. `.on()` returns an unsubscribe function. `.effect()` runs immediately and again when the original input emits an `input` event.

### `datepicker(inputSelector, options)`

Accepts an input element or CSS selector. Options are `emptyText` (default `'[not set]'`), `locales`, and `dateTimeOptions`; the latter two are passed to `Date.toLocaleString()` for view-mode formatting.

Configure the control before calling `.make()`:

- `.addStyles(css)` adds scoped styles.
- `.addDefaultQuickActions()` adds Today, Now, day/hour adjustments, Midnight, and Clear.
- `.addQuickAction({ label, action, effect })` adds one custom button.
- `.addQuickActions(actions)` adds an array of custom buttons.

A custom action receives `{ input, datetime, button, today, now, formatDt }`. Set `datetime.value` to change the date/time; the button handler synchronizes the original input. An optional `effect({ input, datetime, button })` runs immediately and when the date/time input changes. Quick-action methods have no effect in view mode.

### `imgpreview(inputSelector)`

Accepts an input element or CSS selector for an image URL field. Use `.addStyles(css).make()` to style and create the preview. Empty values hide the image; failed loads display an error message. In edit mode, changes update after a short debounce, and URLs containing the current origin have that origin removed before saving.

### `codehighlighter(inputSelector, options)`

Accepts an input element or CSS selector. Options default to:

```js
{
  language: 'javascript',
  theme: 'atom-one-light',
  collapsed: true,
  emptyText: '[not set]',
}
```

Call `.make()` first, then `.addStyles(css)` on its result. In view mode, a nonempty value also exposes `.expand()` and `.collapse()` on that result. Highlighting loads when expanded; if highlighting fails, the source is shown as plain text.

## Styling and browser requirements

`formControl` marks elements with `data-control="form"`, `"question"`, `"label"`, and `"input"` for styling. Helpers expose additional hooks such as `[data-datepicker-quick-actions]`, `[data-datepicker-empty]`, `[data-codehighlighter]`, and `[data-codehighlighter-empty]`.

Use a modern browser with JavaScript modules, `crypto.randomUUID()`, and CSS `@scope` support. Scoped styles require `@scope`; code-highlighter themes are loaded globally and can affect other highlight.js code on the page.

The host page must allow scripts from `cdn.jsdelivr.net`. The code highlighter additionally loads highlight.js modules from `esm.sh` and theme styles from `cdnjs.cloudflare.com`.

## Local development

Serve the repository through a local HTTP server and open `test-page.html`. That page imports `./src/forms/index.js` and demonstrates editable and read-only forms. Keep the `forms` and `helpers` folder structure intact when hosting the source so relative imports continue to resolve.
