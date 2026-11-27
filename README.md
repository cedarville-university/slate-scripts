# slate-scripts

JavaScript helpers for enhancing Slate forms with date/time controls, repeaters, image previews, syntax highlighting, and question-level behavior. The source uses browser-native JavaScript modules; no build step is required.

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

### `formControl(formSelector, { onSubmit = null } = {})`

Accepts a CSS selector or an `HTMLFormElement`. Its methods can be chained:

- `.question(label, callback)` calls the callback with `{ question, questions, isEditing }`. `questions` is a `Map` keyed by label, and `isEditing` is a boolean for the form.
- `.questions(callback)` supplies a collection whose `.style(styles, applyTo)` method styles all discovered questions.
- `.style(styles)` applies an inline style object to the form.
- `.addStyles(css)` appends CSS scoped to the form using `@scope`.

Each question exposes `question` (the question container), `label`, `input`, `.style(styles, applyTo = 'input')`, `.on(event, handler, options)`, and `.effect(callback)`. Style targets are `'input'`, `'label'`, and `'question'`. `.on()` returns an unsubscribe function. `.effect()` runs immediately and again when the original input emits an `input` event.

#### Question validation

`.addValidator(fn, options = {})` registers a synchronous validator. Return `true` to pass, an error message string to fail, or `[message, cleanup]` to attach cleanup to that particular failed result. Validators receive `{ input, question, label, event, target }`. On manual or submission validation, `event` and `target` are `null`; on event validation, `target` is the registered element (`event.currentTarget`), while `event.target` may be a descendant.

Use one call to configure validation, event-based clearing, and result callbacks:

```js
formControl('#your-form-id')
  .question('Reason', ({ question }) => {
    const customInput = document.querySelector('#custom-reason')
    if (!customInput) return

    question.addValidator(
      () => customInput.value.trim() !== '' ? true : 'Enter a reason',
      {
        validateWhen: [
          {
            targets: [customInput],
            events: ['blur'],
            // Optional; omit when every blur should validate.
            when: () => !customInput.disabled,
          },
        ],
        clearErrorsWhen: [
          {
            targets: [customInput],
            // events defaults to ['input', 'change']
            when: () => customInput.value.trim() !== '',
            onClear: () => {
              customInput.removeAttribute('aria-invalid')
              customInput.removeAttribute('data-invalid')
            },
          },
        ],
        onValid: () => {
          customInput.removeAttribute('aria-invalid')
        },
        onInvalid: ({ messages }) => {
          customInput.setAttribute('aria-invalid', 'true')
          customInput.setAttribute('data-invalid', messages.join(', '))
        },
      },
    )
  })
```

Both `validateWhen` and `clearErrorsWhen` are arrays and default to `[]`. Registrations persist across validation and clearing cycles. All event-based validation and clearing is opt-in; no listeners are implicitly attached to the question's original input.

| Option | Behavior |
| --- | --- |
| `validateWhen[].targets` | An element or nonempty iterable collection of elements, such as an array or `NodeList`. Resolve selectors to elements first. Each event validates only this validator, even before the first submission. |
| `validateWhen[].events` | Required event name or nonempty iterable collection of event names, such as `['blur']`. There is no default validation event. |
| `clearErrorsWhen[].targets` | Elements whose events may clear only this validator's errors. May be omitted to register an `onClear` callback without listeners. |
| `clearErrorsWhen[].events` | Event name or nonempty iterable collection of event names; defaults to `['input', 'change']`. |
| `when(context)` | Optional synchronous predicate on either trigger type, receiving the same context as the validator. Only an explicit `true` permits that event's action. Other values, including promises, do not. Omitting it makes the trigger unconditional. It does not gate manual or submission validation, or cleanup when errors clear through another path. |
| `clearErrorsWhen[].onClear()` | Optional cleanup for this validator's errors. Receives no arguments. All its registered cleanup callbacks run once per failed result when those errors clear, regardless of which trigger cleared them or whether that trigger's `when` passed. |
| `onValid(result)` / `onInvalid(result)` | Optional callbacks at the validator-options level. Exactly one runs after each completed validation attempt, including event, manual, and submission validation. They run on every attempt, not just validity transitions. Receive the validator context plus `{ valid, messages }`. Messages are a copy for this validator only. Clearing alone invokes neither callback. |

To clear this validator's errors when the original input changes:

```js
question.addValidator(validate, {
  clearErrorsWhen: [
    { targets: [question.input] },
  ],
})
```

When the same target and event are configured for both validation and clearing, an allowed validation trigger takes precedence. This prevents a clearing trigger from hiding the error just produced by validation. Duplicate validation triggers on the same target and event result in one validation attempt. As with regular DOM events, events can bubble to registered ancestor elements; `blur` itself does not bubble, so register the input directly or use `focusout` on a container.

Invalid validator functions, option types, callback types, elements, and empty or whitespace-containing event names throw `TypeError`. Each trigger must be an object, and both trigger collections must be arrays. A missing `validateWhen` target or event is invalid. Options are checked before adding the validator or its listeners.

#### Error state and cleanup

Errors are stored per validator and displayed together, in validator registration order, as comma-separated text in `[data-control="error"]`. The question has `data-invalid`, and its original input has `aria-invalid="true"`, for as long as any validator has an error. Clearing one rule does not hide errors from another rule or another question.

The control refreshes its error text and invalid attributes after callbacks too, so a callback touching the original input cannot hide another validator's error. Custom controls can manage their own attributes independently.

- `.validate()` clears the previous results for this question, runs all its validators, and returns whether all passed. Revalidating through `validateWhen` replaces only that validator's result.
- `.clearErrors()` clears all validators' errors on this question and runs their cleanup without revalidating.
- Before replacing a failed result, its message-specific cleanup runs, followed by its persistent cleanup callbacks. The validator then runs and its `onValid` or `onInvalid` callback runs after the updated errors are rendered.
- Each `clearErrorsWhen[].onClear` remains registered for future cycles, but runs only when its own validator had an error to clear. A passing validator's cleanup does not run because another validator failed or cleared. Calling `.clearErrors()` again without new errors does not rerun cleanup.

The existing `.addValidator(fn, onClear)` signature remains supported, including `null` as the second argument. Its persistent `onClear` now follows the same per-validator lifecycle: it runs after the message-specific cleanup only when that validator's own errors clear. Previously, it also ran for passing validators whenever the question's errors cleared. Migrate new code to `clearErrorsWhen: [{ onClear }]` to keep clearing configuration together.

```js
question.addValidator(
  ({ input }) => {
    if (input.value.trim()) return true

    const previousBackground = input.style.backgroundColor
    input.style.backgroundColor = '#fff0f0'
    return ['Reason is required', () => {
      input.style.backgroundColor = previousBackground
    }]
  },
  () => {
    // Existing callback signature; runs when this validator's errors clear.
    console.log('Reason errors cleared')
  },
)
```

#### Existing question-wide clear triggers

`.clearErrorsOn(target, events = ['input', 'change'], { test = null, onClear = null } = {})` remains supported for explicitly clearing the entire question. It accepts an element or nonempty collection of elements, plus an event name or nonempty collection of event names, and returns an unsubscribe function. `test(context)` is synchronous, receives the event context described above, and must return exactly `true` to allow clearing. Omitting it makes the trigger unconditional.

```js
const unsubscribe = question.clearErrorsOn(dismissButton, 'click', {
  test: () => !dismissButton.disabled,
  onClear: () => console.log('All question errors cleared'),
})

// Removes this registration's listeners and cleanup without clearing errors.
// unsubscribe()
```

Its `onClear()` callback is question-wide: it runs after validator cleanup when the last remaining question error clears, including through manual clearing, a registered trigger, or revalidation. It does not run when one rule clears while another still has errors, or when there were no errors. Unsubscribing affects only that registration. Prefer `clearErrorsWhen` when a trigger should clear just its owning validator.

When clearing depends on an operation succeeding, call `.clearErrors()` after that operation instead of registering a click trigger. For example, `reasons.addItem(item)` followed by `question.clearErrors()` preserves errors if adding the item throws.

#### Submission behavior

Validation still runs automatically when the form's `button.default` is clicked. All validators on each question run, but questions are checked in order only until the first failing question. The click is blocked on failure. Event-trigger conditions do not prevent submission validation. The optional form-level `onSubmit()` callback runs after that validation attempt, including when validation fails, and can also block the click by returning `false`. For other submission paths, call the questions' `.validate()` methods explicitly.

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

### `repeater(inputSelector, options)`

Turns an input or textarea containing a JSON array of objects into a table. Custom storage formats can be configured with `storage`. Accepts an element or CSS selector, initializes immediately, and keeps the original input for saving; no `.make()` call is needed. A blank value is treated as `[]`. The input must belong to a form. The repeater does not automatically disable actions in read-only mode: initialize it in **Edit Scripts/Styles** for editing, or explicitly hide actions for a display-only use case.

| Option | Default | Behavior |
| --- | --- | --- |
| `keys` | `null` | Ordered array of key strings or `{ key, formatter }` objects. Defines columns even before items exist. If omitted, keys are inferred from the first item. |
| `formatter` | `null` | Fallback `(key, value)` formatter. A column's `(value, item)` formatter takes precedence. Formatters affect displayed cells, not saved values. |
| `emptyText` | `null` | Text displayed in a spanning table cell when empty. `null` hides the empty message. |
| `maxNewItems` | `null` | Maximum number of items added during this initialization that may remain. Existing items do not count. `null` means unlimited; `0` prevents additions. |
| `visibility` | `{ table: true, empty: true, action: true }` | Initial visibility preferences; partial objects are supported. |
| `renderActions` | `null` | Callback called once after initialization to build arbitrary controls. |
| `styles` | `null` | CSS string applied once before `renderActions`, using the same parent-container scope as `addStyles(css)`. |
| `storage` | JSON parsing and serialization | `{ parse(value), serialize(items) }` converts between stored text and item objects. |
| `container` | `input.parentElement` | Element where the repeater is appended. |

`keys` also selects which item fields are displayed; other fields remain available to the storage serializer. `editAction`, `deleteAction`, and `format` are excluded from column inference and explicit keys. The table header is shown with item rows; when empty, only the configured empty message is displayed.

#### Reuse options and styles

Use a shared options object and override individual options when initializing each repeater:

```js
const repeaterDefaults = {
  maxNewItems: 2,
  emptyText: 'No items added',
  styles: `
    [data-repeater-root] table { width: 100%; }
    [data-repeater-action] { margin-block-start: 0.5rem; }
    [data-repeater-empty] { color: #666; }
  `,
};

const reasons = repeater('#reasons-input', {
  ...repeaterDefaults,
  keys: ['Name', 'Date'],
});
const contacts = repeater('#contacts-input', {
  ...repeaterDefaults,
  keys: ['Name', 'Email'],
  maxNewItems: 5,
});
```

`styles: null` skips style registration. A supplied string must contain non-whitespace CSS, as with `addStyles`. Each repeater registers its own scoped style element; `addStyles(css)` remains available for additional styles afterward. Spreading options is a shallow merge, so merge nested options separately when overriding only some of their properties.

#### Build controls with `renderActions`

This example uses local module paths; for Slate, import from the deployed entry point containing the repeater. Replace the input selectors with your own. It initially displays existing items only, then reveals the add controls when another field differs from its original value.

```js
import { repeater } from './src/forms/index.js';

const otherField = document.querySelector('#other-field');
const originalValue = otherField.value;
const reasons = repeater('#reasons-input', {
  keys: [
    'Name',
    {
      key: 'Date',
      formatter: (value) => new Date(value).toLocaleDateString(),
    },
  ],
  maxNewItems: 2,
  emptyText: 'No reasons added',
  visibility: { empty: false, action: false },
  renderActions({ container, addItem }) {
    container.innerHTML = `
      <div>
        <input data-reason placeholder="Reason" aria-label="Reason">
        <button data-add type="button">Add</button>
      </div>
    `;
    const reason = container.querySelector('[data-reason]');
    const add = container.querySelector('[data-add]');

    const addReason = () => {
      const name = reason.value.trim();
      if (!name) return;
      addItem({
        Name: name,
        Date: new Date().toISOString(),
        deleteAction: { label: 'Delete' },
      });
      reason.value = '';
    };

    add.addEventListener('click', addReason);
    reason.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        addReason();
      }
    });
  },
});

otherField.addEventListener('input', () => {
  reasons.setVisibility({ action: otherField.value !== originalValue });
});
```

The callback receives the returned API, except `container` refers to the **action bar**. Outside the callback, `reasons.container` refers to the repeater's parent container. Controls can use trusted `innerHTML` followed by scoped selectors, as above, or `createElement`. Use `textContent` or input `.value` for user-provided content. Keep buttons as `type="button"` and use an Enter handler rather than nesting a form inside the Slate form.

Direct access remains available: omit `renderActions` and populate `reasons.action` yourself. The action bar sits below and outside the horizontally scrollable `tableWrapper`.

#### Item actions and saving

Pass action configurations on individual items:

```js
reasons.addItem({
  Name: 'Example',
  Date: new Date().toISOString(),
  editAction: {
    label: 'Edit',
    classList: ['edit-button'],
    action: (event) => { /* Open your own editor. */ },
  },
  deleteAction: {
    label: 'Delete',
    classList: ['delete-button'],
    // Optional action(event); omitted here to remove this item automatically.
  },
});
```

Labels support trusted HTML and default to `'edit'` and `'delete'`. `classList` is an optional array of CSS class names. Provide an edit click handler; editing is application-defined. A custom delete handler replaces automatic deletion, so call `removeItem(index)` yourself if needed. Default deletion resolves the row's current index at click time.

`addItem`, `removeItem`, `removeLastItem`, `removeLastNewItem`, and `removeNewItems` synchronize the original input's value using the configured serializer. `editAction` and `deleteAction` are omitted from saved JSON without removing them from the in-memory items. They must be supplied again when reconstructing actions on a later form visit. These methods do not dispatch `input` or `change` events.

At `maxNewItems`, the action bar hides and further `addItem` calls throw `RangeError`. Removing an item added during this initialization frees a slot; removing an existing item does not. The bar reappears only if its visibility preference allows it.

#### Custom storage formats

The repeater always works with an array of objects internally. `storage.parse(value)` receives the original input string once during initialization and must return an array of non-null, non-array objects, including `[]` for an empty field. `storage.serialize(items)` runs after item additions and removals and must return a string. Both callbacks are synchronous. Invalid callback types or return types throw `TypeError`; errors thrown by a callback propagate to the caller. Initialization does not rewrite the stored value.

Both callbacks are optional individually and default to JSON behavior. For a different format, supply both so saved values can be loaded again. The serializer receives shallow copies of item data with `editAction` and `deleteAction` omitted; the in-memory action configurations remain intact.

For one item per line, with fields separated by ` | `:

```js
const reasons = repeater('#reasons-input', {
  keys: ['Name', 'Date'],
  storage: {
    parse(value) {
      if (!value.trim()) return [];
      return value.split(/\r?\n/).map((line) => {
        const fields = line.split(' | ');
        if (fields.length !== 2) {
          throw new Error('Each line must contain Name | Date');
        }
        const [Name, Date] = fields;
        return { Name, Date };
      });
    },
    serialize(items) {
      return items.map(({ Name, Date }) => {
        const fields = [String(Name ?? ''), String(Date ?? '')];
        if (fields.some((value) => /[\r\n]/.test(value) || value.includes(' | '))) {
          throw new Error('Values cannot contain newlines or " | "');
        }
        return fields.join(' | ');
      }).join('\n');
    },
  },
});
```

This stores text such as:

```text
Alice | 2026-11-19
Bob | 2026-11-20
```

Use a textarea or hidden input for multiline storage. This example stores only `Name` and `Date` and rejects delimiter/newline characters rather than escaping them. Validate those characters in your add controls before calling `addItem`; serialization errors do not roll back changes already made to in-memory items and rendered rows. Existing JSON data must be converted before switching the field to this format.

#### Visibility and returned API

Visibility preferences persist across additions and removals:

- `table`: allows existing item rows and their header to display.
- `empty`: allows the empty message when no rows exist and `emptyText` is not `null`, independently of the `table` preference.
- `action`: allows the action bar when the new-item limit has not been reached.

If neither rows nor an empty message should display, the table and its scroll wrapper are hidden. If all parts are hidden, the root wrapper is hidden too.

```js
reasons.setVisibility({ action: true }); // Partial update; preserves other preferences.
reasons.hide('table', 'empty');
reasons.show(reasons.action);
reasons.toggle('action');
```

`setVisibility`, `show`, `hide`, and `toggle` return the repeater API for chaining and are also available in `renderActions`. Helpers accept multiple part names (`'table'`, `'empty'`, `'action'`) or their elements. `tableWrapper` maps to the table preference; `emptyRow` maps to the empty preference. Toggling a managed part flips its preference, not its current effective visibility: limits and empty-state rules still apply. Custom elements are also accepted and have their inline `display` changed directly.

The returned API exposes:

- `items`: live array of item objects. Use item methods rather than mutating the array directly.
- `addItem(item)`, `removeItem(index)`, `removeLastItem()`: manage saved items. Indexes are zero-based; invalid removal indexes do nothing.
- `removeLastNewItem()`: removes the most recently added item still present from this initialization, or does nothing if none remain. Existing items are preserved. Available in `renderActions` and returns the repeater API for chaining.
- `removeNewItems()`: removes all items added during this initialization while preserving existing items. Does nothing if none remain. Available in `renderActions` and returns the repeater API for chaining; counts, storage, and visibility update automatically.
- `addRow(item)`, `removeRow(index)`: low-level rendering methods only; they do not update stored items or new-item counts. Prefer the item methods to keep data and rows aligned.
- `addStyles(css)`: adds styles scoped to the repeater's parent container.
- `container`, `wrapper`, `tableWrapper`, `table`, `thead`, `headerRow`, `headers`, `tbody`, `rows`, `empty`, `emptyRow`, and `action`: element and row references. Each `rows` entry contains `{ row, cells }`; the final cell holds item actions.

Style with `[data-repeater-root]`, `[data-repeater-table-wrapper]`, `[data-repeater-empty]`, `[data-repeater-action]`, and `[data-repeater-action-col]`. There is no `tfoot`; the action bar is a separate `<div>`.

## Styling and browser requirements

`formControl` marks elements with `data-control="form"`, `"question"`, `"label"`, and `"input"` for styling. Helpers expose additional hooks such as `[data-datepicker-quick-actions]`, `[data-datepicker-empty]`, `[data-codehighlighter]`, and `[data-codehighlighter-empty]`.

Use a modern browser with JavaScript modules, `crypto.randomUUID()`, and CSS `@scope` support. Scoped styles require `@scope`; code-highlighter themes are loaded globally and can affect other highlight.js code on the page.

The host page must allow scripts from `cdn.jsdelivr.net`. The code highlighter additionally loads highlight.js modules from `esm.sh` and theme styles from `cdnjs.cloudflare.com`.

## Local development

To run the validation trigger regression checks, serve the repository through a local HTTP server (for example, `python3 -m http.server 8000`) and open `http://localhost:8000/tests/form.test.html`. The page reports each result without requiring dependencies or a build step.

Serve the repository through a local HTTP server and open `test-page.html`. That page imports `./src/forms/index.js` and demonstrates editable and read-only forms. Keep the `forms` and `helpers` folder structure intact when hosting the source so relative imports continue to resolve.
