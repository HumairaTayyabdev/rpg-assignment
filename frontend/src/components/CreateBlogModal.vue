<script setup lang="ts">
import { useMutation } from '@vue/apollo-composable'
import { computed, reactive, ref, watch } from 'vue'
import { CREATE_POST_MUTATION, UPDATE_POST_MUTATION } from '@/graphql/blog'
import type { BlogPost } from '@/types/blog'
import { extractGraphQLErrorMessage } from '@/utils/graphql-errors'

export type PublishedBlogPost = BlogPost

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    editingPost?: PublishedBlogPost | null
  }>(),
  { editingPost: null },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  published: [post: PublishedBlogPost]
  updated: [post: PublishedBlogPost]
}>()

const form = reactive({
  title: '',
  content: '',
})

const errorMessage = ref('')

const { mutate: createPost, loading: createLoading } = useMutation(CREATE_POST_MUTATION)
const { mutate: updatePost, loading: updateLoading } = useMutation(UPDATE_POST_MUTATION)

const isEditMode = computed(() => props.editingPost != null)
const submitting = computed(() => createLoading.value || updateLoading.value)

const modalTitle = computed(() => (isEditMode.value ? 'Edit blog post' : 'New blog post'))

const primaryLabel = computed(() => {
  if (submitting.value) {
    return isEditMode.value ? 'Saving...' : 'Publishing...'
  }
  return isEditMode.value ? 'Save post' : 'Publish post'
})

watch(
  () => [props.modelValue, props.editingPost] as const,
  ([open, edit]) => {
    if (!open) {
      form.title = ''
      form.content = ''
      errorMessage.value = ''
      return
    }
    if (edit) {
      form.title = edit.title
      form.content = edit.content
      errorMessage.value = ''
    } else {
      form.title = ''
      form.content = ''
      errorMessage.value = ''
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

async function onSubmit() {
  errorMessage.value = ''

  try {
    if (isEditMode.value && props.editingPost) {
      const result = await updatePost({
        id: props.editingPost.id,
        input: {
          title: form.title,
          content: form.content,
        },
      })

      if (!result?.data?.updatePost) {
        throw new Error('No post was returned.')
      }

      emit('updated', result.data.updatePost)
    } else {
      const result = await createPost({
        input: {
          title: form.title,
          content: form.content,
        },
      })

      if (!result?.data?.createPost) {
        throw new Error('No post was returned.')
      }

      emit('published', result.data.createPost)
    }

    close()
  } catch (error) {
    errorMessage.value = extractGraphQLErrorMessage(error)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="backdrop"
      data-cy="blog-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      @click.self="close"
    >
      <div class="modal-card">
        <div class="modal-head">
          <h2 id="modal-title">{{ modalTitle }}</h2>
          <button type="button" class="icon-close" aria-label="Close" @click="close">×</button>
        </div>

        <form class="modal-form" @submit.prevent="onSubmit">
          <label>
            Title
            <input
              v-model="form.title"
              data-cy="blog-modal-title"
              name="title"
              placeholder="Session notes"
              required
              type="text"
            />
          </label>
          <label>
            Plain text content
            <textarea
              v-model="form.content"
              data-cy="blog-modal-content"
              name="content"
              placeholder="Write the post body here..."
              rows="6"
              required
            ></textarea>
          </label>

          <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>

          <button class="primary-button" type="submit" data-cy="blog-modal-submit" :disabled="submitting">
            {{ primaryLabel }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(0, 45, 40, 0.45);
  backdrop-filter: blur(10px);
}

.modal-card {
  width: min(100%, 480px);
  max-height: min(90vh, 640px);
  overflow: auto;
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 24px;
  padding: 1.35rem 1.45rem 1.45rem;
  background: var(--rp-white, #fff);
  box-shadow: var(--rp-shadow-lg, 0 22px 50px rgba(0, 61, 54, 0.12));
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.1rem;
}

.modal-head h2 {
  margin: 0;
  color: var(--rp-teal-900, #003d36);
  font-size: clamp(1.45rem, 3vw, 1.85rem);
  font-weight: 820;
  letter-spacing: -0.03em;
}

.icon-close {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--rp-border-strong, rgba(0, 77, 64, 0.2));
  border-radius: 12px;
  background: var(--rp-teal-50, #eef9f7);
  color: var(--rp-teal-800, #004d40);
  cursor: pointer;
  font-size: 1.35rem;
  line-height: 1;
}

.icon-close:hover {
  background: var(--rp-teal-100, #d0f0f0);
  color: var(--rp-orange, #f26522);
}

label {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
  color: var(--rp-text-muted, #4a5654);
  font-size: 0.92rem;
  font-weight: 750;
}

input,
textarea {
  width: 100%;
  border: 1px solid var(--rp-border-strong, rgba(0, 77, 64, 0.2));
  border-radius: 14px;
  outline: 0;
  padding: 0.85rem 0.95rem;
  color: var(--rp-text, #1a1f1e);
  background: var(--rp-white, #fff);
  font: inherit;
}

textarea {
  min-height: 8rem;
  resize: vertical;
  line-height: 1.45;
}

input:focus,
textarea:focus {
  border-color: var(--rp-teal-600, #1a7a6e);
  box-shadow: 0 0 0 4px var(--rp-focus, rgba(13, 107, 95, 0.2));
}

input::placeholder,
textarea::placeholder {
  color: var(--rp-text-soft, #6b7875);
}

.form-message {
  margin-bottom: 1rem;
  border-radius: 16px;
  padding: 0.85rem 1rem;
  font-weight: 750;
}

.form-message.error {
  color: #8b1d1d;
  background: rgba(242, 101, 34, 0.12);
}

.primary-button {
  width: 100%;
  margin-top: 0.25rem;
  border: 0;
  border-radius: 999px;
  padding: 0.9rem 1.1rem;
  color: var(--rp-white, #fff);
  background: var(--rp-orange, #f26522);
  box-shadow: 0 12px 28px rgba(242, 101, 34, 0.28);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 850;
}

.primary-button:hover:not(:disabled) {
  background: var(--rp-orange-hover, #e05518);
}

.primary-button:disabled {
  cursor: wait;
  opacity: 0.7;
}
</style>
