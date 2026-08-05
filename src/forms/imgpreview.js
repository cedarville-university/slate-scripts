import { isEditing, resolveInputSelector } from '../helpers/forms.js'
import { debounce, registerStyles } from '../helpers/utlity.js'

export default function imgpreview(inputSelector) {
  const { input, question, isEditing } = resolveInputSelector(inputSelector)
  const container = input.parentElement

  const img = container.querySelector('img') ?? document.createElement('img')
  let handlerAttached = false

  const prepareImg = () => {
    const inputValue = input.value.trim()
    img.style.display = inputValue || 'none'
    img.src = inputValue

    img.onerror = () => {
      const errorDiv = document.createElement('div')
      errorDiv.classList.add('error')
      errorDiv.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"></path>
          </svg>
          <span>Image preview could not be loaded</span>
        `
      if (container.querySelector('.error')) {
        container.querySelector('.error').replaceWith(errorDiv)
      } else if (container.querySelector('img')) {
        container.querySelector('img').replaceWith(errorDiv)
      } else {
        container.append(errorDiv)
      }
    }

    img.onload = () => {
      container.querySelector('.error')?.remove()
    }

    if (!container.querySelector('img')) {
      container.append(img)
    }
  }

  const handleInput = () => {
    if (isEditing) {
      input.addEventListener(
        'input',
        debounce(() => {
          // only store relative urls
          const origin = window.location.origin
          if (input.value.includes(origin)) {
            input.value = input.value.replace('origin', '')
          }

          prepareImg()
        }),
      )
    }
  }

  return {
    addStyles(content) {
      registerStyles(content, question)
      return this
    },
    make: () => {
      prepareImg()
      if (isEditing) {
        handleInput()
      }
    },
  }
}
