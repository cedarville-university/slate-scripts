const checkCallback = (callback, name) => {
  if (callback != null && typeof callback !== 'function') {
    throw new TypeError(`${name} must be a function or null`)
  }
}

const resolveTargets = (targets, name) => {
  const elements =
    targets instanceof Element ? [targets] : Array.from(targets ?? [])
  if (
    !elements.length ||
    elements.some((element) => !(element instanceof Element))
  ) {
    throw new TypeError(
      `${name} requires an element or a collection of elements`,
    )
  }
  return elements
}

const resolveEvents = (events, name) => {
  const names = typeof events === 'string' ? [events] : Array.from(events ?? [])
  if (
    !names.length ||
    names.some(
      (event) => typeof event !== 'string' || !event.trim() || /\s/.test(event),
    )
  ) {
    throw new TypeError(
      `${name} requires an event name or a collection of event names`,
    )
  }
  return names
}

const resolveTriggers = (triggers, name, clearing = false) => {
  if (!Array.isArray(triggers)) throw new TypeError(`${name} must be an array`)
  return triggers.map((trigger) => {
    if (!trigger || typeof trigger !== 'object' || Array.isArray(trigger)) {
      throw new TypeError(`${name} entries must be objects`)
    }
    const {
      targets,
      events = clearing ? ['input', 'change'] : undefined,
      when = null,
      onClear = null,
    } = trigger
    checkCallback(when, `${name} when`)
    checkCallback(onClear, `${name} onClear`)
    // Clearing configurations may supply only cleanup, without event listeners.
    const elements =
      clearing && targets == null ? [] : resolveTargets(targets, name)
    const names =
      elements.length || events !== undefined ? resolveEvents(events, name) : []
    return { targets: elements, events: names, when, onClear }
  })
}

const listen = (trigger, handler) => {
  trigger.targets.forEach((target) => {
    trigger.events.forEach((event) => target.addEventListener(event, handler))
  })
  return () => {
    trigger.targets.forEach((target) => {
      trigger.events.forEach((event) =>
        target.removeEventListener(event, handler),
      )
    })
  }
}

export function questionValidation({ question, label, input }) {
  const validators = []
  const clearCallbacks = new Set()
  const errorEl = document.createElement('span')
  errorEl.dataset.control = 'error'
  errorEl.style.display = 'none'
  question.append(errorEl)

  const context = (event = null) => ({
    input,
    question,
    label,
    event,
    target: event?.currentTarget ?? null,
  })
  const hasErrors = () => validators.some(({ messages }) => messages.length > 0)
  const renderErrors = () => {
    const messages = validators.flatMap((validator) => validator.messages)
    question.toggleAttribute('data-invalid', messages.length > 0)
    if (messages.length) input.setAttribute('aria-invalid', 'true')
    else input.removeAttribute('aria-invalid')
    errorEl.textContent = messages.join(', ')
    errorEl.style.display = messages.length ? '' : 'none'
  }

  const clearResults = (records) => {
    const hadErrors = hasErrors()
    const pending = records
      .filter((record) => record.messages.length)
      .map((record) => {
        const cleanup = record.cleanup
        record.messages = []
        record.cleanup = null
        return { record, cleanup }
      })
    renderErrors()
    pending.forEach(({ cleanup }) => cleanup?.())
    pending.forEach(({ record }) => {
      record.onClear?.()
      record.clearErrorsWhen.forEach(({ onClear }) => onClear?.())
    })
    // A custom callback may touch the original input. Keep its invalid state
    // consistent with errors that still belong to another validator.
    renderErrors()
    if (hadErrors && !hasErrors()) {
      Array.from(clearCallbacks).forEach((cleanup) => cleanup())
    }
  }
  const clearErrors = () => clearResults(validators)

  const runValidator = (record, details) => {
    const result = record.fn(details)
    if (result !== true) {
      const [message, cleanup] = Array.isArray(result) ? result : [result]
      record.messages = [message]
      record.cleanup = typeof cleanup === 'function' ? cleanup : null
    }
    renderErrors()
    const valid = record.messages.length === 0
    const callback = valid ? record.onValid : record.onInvalid
    callback?.({ ...details, valid, messages: [...record.messages] })
    renderErrors()
    return valid
  }

  const addValidator = (fn, options = {}) => {
    if (typeof fn !== 'function')
      throw new TypeError('Validator must be a function')
    // Preserve addValidator(fn, onClear), including an explicit null callback.
    const settings =
      typeof options === 'function' ? { onClear: options } : (options ?? {})
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      throw new TypeError(
        'Validator options must be an object or an onClear callback',
      )
    }
    const { onValid = null, onInvalid = null, onClear = null } = settings
    checkCallback(onValid, 'onValid')
    checkCallback(onInvalid, 'onInvalid')
    checkCallback(onClear, 'onClear')
    // Resolve everything before adding state or listeners, so invalid options
    // cannot leave a partially registered validator behind.
    const validateWhen = resolveTriggers(
      settings.validateWhen ?? [],
      'validateWhen',
    )
    const clearErrorsWhen = resolveTriggers(
      settings.clearErrorsWhen ?? [],
      'clearErrorsWhen',
      true,
    )
    const record = {
      fn,
      onValid,
      onInvalid,
      onClear,
      clearErrorsWhen,
      messages: [],
      cleanup: null,
    }
    validators.push(record)
    // Merge matching registrations so a clearing trigger cannot immediately
    // hide the validation result produced by the same target/event.
    const bindings = new Map()
    const collect = (triggers, kind) =>
      triggers.forEach((trigger) => {
        trigger.targets.forEach((target) => {
          if (!bindings.has(target)) bindings.set(target, new Map())
          const events = bindings.get(target)
          trigger.events.forEach((event) => {
            if (!events.has(event))
              events.set(event, { validate: [], clear: [] })
            events.get(event)[kind].push(trigger)
          })
        })
      })
    collect(validateWhen, 'validate')
    collect(clearErrorsWhen, 'clear')
    bindings.forEach((events, target) => {
      events.forEach((triggers, name) =>
        target.addEventListener(name, (event) => {
          const details = context(event)
          const allowed = (trigger) =>
            trigger.when == null || trigger.when(details) === true
          if (triggers.validate.some(allowed)) {
            clearResults([record])
            runValidator(record, details)
          } else if (record.messages.length && triggers.clear.some(allowed)) {
            clearResults([record])
          }
        }),
      )
    })
  }

  const clearErrorsOn = (
    target,
    events = ['input', 'change'],
    { test = null, onClear = null } = {},
  ) => {
    const trigger = {
      targets: resolveTargets(target, 'clearErrorsOn'),
      events: resolveEvents(events, 'clearErrorsOn'),
    }
    checkCallback(test, 'clearErrorsOn test')
    checkCallback(onClear, 'clearErrorsOn onClear')
    const cleanup = () => onClear?.()
    const unsubscribe = listen(trigger, (event) => {
      if (!hasErrors()) return
      if (test != null && test(context(event)) !== true) return
      clearErrors()
    })
    clearCallbacks.add(cleanup)
    return () => {
      clearCallbacks.delete(cleanup)
      unsubscribe()
    }
  }

  return {
    addValidator,
    validate: () => {
      clearErrors()
      // Run all validators on this question, even after one fails.
      const results = validators.map((record) =>
        runValidator(record, context()),
      )
      return results.every(Boolean)
    },
    clearErrors,
    clearErrorsOn,
  }
}
