<script setup lang="ts">
import { useApolloClient, useMutation } from '@vue/apollo-composable'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LOG_IN_MUTATION, ME_QUERY, SIGN_UP_MUTATION } from '@/graphql/auth'
import type {
  LogInResponse,
  LogInVariables,
  MeResponse,
  SignUpResponse,
  SignUpVariables,
} from '@/types/auth'
import { clearAuthSession, getAuthToken, setAuthToken, setAuthUserJson } from '@/utils/auth-storage'
import { extractGraphQLErrorMessage } from '@/utils/graphql-errors'

type AuthMode = 'signup' | 'login'

const router = useRouter()
const { resolveClient } = useApolloClient()

const mode = ref<AuthMode>('signup')
const errorMessage = ref('')

const form = reactive({
  name: '',
  email: '',
  password: '',
})

const { mutate: signUp, loading: signingUp } = useMutation<SignUpResponse, SignUpVariables>(
  SIGN_UP_MUTATION,
)
const { mutate: logIn, loading: loggingIn } = useMutation<LogInResponse, LogInVariables>(
  LOG_IN_MUTATION,
)

const isLoading = computed(() => signingUp.value || loggingIn.value)
const buttonLabel = computed(() => {
  if (isLoading.value) {
    return mode.value === 'signup' ? 'Creating your account...' : 'Signing you in...'
  }

  return mode.value === 'signup' ? 'Create account' : 'Log in'
})

const eyebrow = computed(() =>
  mode.value === 'signup' ? 'Start your writing room' : 'Welcome back',
)

async function redirectIfSessionValid(): Promise<void> {
  if (!getAuthToken()) {
    return
  }

  try {
    const client = resolveClient()
    const { data } = await client.query<MeResponse>({
      query: ME_QUERY,
      fetchPolicy: 'network-only',
    })

    if (data?.me) {
      setAuthUserJson(data.me)
      await router.replace('/blogs')
    } else {
      clearAuthSession()
    }
  } catch {
    clearAuthSession()
  }
}

onMounted(() => {
  void redirectIfSessionValid()
})

async function submitAuth() {
  errorMessage.value = ''

  try {
    const payload =
      mode.value === 'signup'
        ? (
            await signUp({
              input: {
                name: form.name,
                email: form.email,
                password: form.password,
              },
            })
          )?.data?.signUp
        : (
            await logIn({
              input: {
                email: form.email,
                password: form.password,
              },
            })
          )?.data?.logIn

    if (!payload) {
      throw new Error('No authentication response was returned.')
    }

    setAuthToken(payload.token)
    setAuthUserJson(payload.user)
    form.password = ''
    await router.push('/blogs')
  } catch (error) {
    errorMessage.value = extractGraphQLErrorMessage(error)
  }
}

function switchMode(nextMode: AuthMode) {
  mode.value = nextMode
  errorMessage.value = ''
}
</script>

<template>
  <main class="auth-page" data-cy="auth-page">
    <section class="hero-panel" aria-labelledby="hero-title">
      <nav class="topline">
        <span class="brand-mark">RPG Blogs</span>
      </nav>

      <div class="hero-copy">
        <p class="eyebrow">Personal publishing</p>
        <h1 id="hero-title">Write and share simple stories with your community.</h1>
        <p class="hero-text">
          Create an account to start your writing space. After you sign in you will land on your
          blogs dashboard.
        </p>
      </div>

      <div class="preview-card" aria-label="Product preview">
        <div class="preview-glow"></div>
        <div class="preview-header">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <article>
          <p class="preview-kicker">Draft preview</p>
          <h2>A quiet update from the road</h2>
          <p>
            "Today I wrote down what happened, saved the moment, and shared it with everyone who
            follows along."
          </p>
        </article>
      </div>
    </section>

    <section class="auth-card" aria-label="Authentication form">
      <form class="auth-form" data-cy="auth-form" @submit.prevent="submitAuth">
        <p class="eyebrow">{{ eyebrow }}</p>
        <h2 data-cy="auth-heading">
          {{ mode === 'signup' ? 'Create your account' : 'Log in to continue' }}
        </h2>

        <div class="mode-switch" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            data-cy="auth-tab-signup"
            :class="{ active: mode === 'signup' }"
            role="tab"
            :aria-selected="mode === 'signup'"
            @click="switchMode('signup')"
          >
            Sign up
          </button>
          <button
            type="button"
            data-cy="auth-tab-login"
            :class="{ active: mode === 'login' }"
            role="tab"
            :aria-selected="mode === 'login'"
            @click="switchMode('login')"
          >
            Log in
          </button>
        </div>

        <label v-if="mode === 'signup'">
          Display name
          <input
            v-model="form.name"
            data-cy="auth-name"
            autocomplete="name"
            name="name"
            placeholder="Lyra Stormscribe"
            required
            type="text"
          />
        </label>

        <label>
          Email
          <input
            v-model="form.email"
            data-cy="auth-email"
            autocomplete="email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </label>

        <label>
          Password
          <input
            v-model="form.password"
            data-cy="auth-password"
            :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
            minlength="10"
            maxlength="128"
            name="password"
            placeholder="10+ chars with a letter and a number"
            required
            type="password"
          />
        </label>
        <p v-if="mode === 'signup'" class="field-hint">
          Use at least 10 characters, including at least one letter and one number.
        </p>

        <p v-if="errorMessage" class="form-message error" data-cy="auth-error">
          {{ errorMessage }}
        </p>

        <button class="primary-button" data-cy="auth-submit" :disabled="isLoading" type="submit">
          {{ buttonLabel }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
  gap: 0.65rem;
  overflow: hidden;
  padding: 1.5rem;
}

.auth-page::before {
  position: absolute;
  inset: 8% auto auto 48%;
  width: 20rem;
  height: 20rem;
  content: '';
  border-radius: 999px;
  background: rgba(208, 240, 240, 0.55);
  filter: blur(72px);
}

.hero-panel,
.auth-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 24px;
  background: var(--rp-surface, #ffffff);
  box-shadow: var(--rp-shadow-lg, 0 22px 50px rgba(0, 61, 54, 0.12));
}

.hero-panel {
  display: flex;
  min-height: calc(100vh - 3rem);
  flex-direction: column;
  justify-content: flex-start;
  padding: 1.75rem;
}

.topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--rp-teal-900, #003d36);
  font-size: 1rem;
  font-weight: 750;
  letter-spacing: 0.02em;
}

.brand-mark::before {
  width: 0.85rem;
  height: 0.85rem;
  content: '';
  border-radius: 999px;
  border: 2px solid var(--rp-teal-800, #004d40);
  background: linear-gradient(
    180deg,
    var(--rp-orange, #f26522) 0%,
    #fff 42%,
    var(--rp-teal-100, #d0f0f0) 100%
  );
  box-shadow: 0 2px 12px rgba(0, 61, 54, 0.12);
}

.eyebrow {
  color: var(--rp-teal-700, #0d6b5f);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero-copy {
  max-width: 540px;
  padding: 8rem 0.75rem 1.25rem;
}

.hero-copy h1 {
  max-width: 520px;
  margin: 0.85rem 0;
  color: var(--rp-teal-900, #003d36);
  font-size: clamp(2.1rem, 4.8vw, 3.8rem);
  font-weight: 780;
  letter-spacing: -0.045em;
  line-height: 1.03;
  text-wrap: balance;
}

.hero-text {
  max-width: 480px;
  color: var(--rp-text-muted, #4a5654);
  font-size: 1rem;
  text-align: justify;
}

.preview-card {
  position: relative;
  width: min(100%, 560px);
  max-width: 560px;
  margin-top: 3rem;
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 22px;
  padding: 1.15rem 1.25rem;
  background: linear-gradient(165deg, var(--rp-peach, #fdf2e9) 0%, var(--rp-white, #fff) 65%);
}

.preview-glow {
  position: absolute;
  right: -3rem;
  bottom: -4rem;
  width: 14rem;
  height: 14rem;
  border-radius: 999px;
  background: rgba(208, 240, 240, 0.55);
  filter: blur(34px);
}

.preview-header {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.4rem;
}

.preview-header span {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 999px;
  background: rgba(0, 77, 64, 0.2);
}

.preview-card article {
  position: relative;
  z-index: 1;
}

.preview-kicker {
  color: var(--rp-orange, #f26522);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.preview-card h2 {
  margin: 0.35rem 0;
  color: var(--rp-teal-900, #003d36);
  font-size: 1.35rem;
  font-weight: 800;
}

.preview-card p:last-child {
  color: var(--rp-text-muted, #4a5654);
}

.auth-card {
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

.auth-form {
  width: min(100%, 480px);
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 24px;
  padding: 1.45rem;
  background: var(--rp-surface, #ffffff);
  box-shadow: var(--rp-shadow, 0 8px 28px rgba(0, 61, 54, 0.08));
}

.auth-form h2 {
  margin: 0.5rem 0 1.25rem;
  color: var(--rp-teal-900, #003d36);
  font-size: clamp(1.8rem, 3.2vw, 2.45rem);
  font-weight: 820;
  letter-spacing: -0.04em;
  line-height: 1.04;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  margin-bottom: 1.15rem;
  border: 1px solid var(--rp-border, rgba(0, 77, 64, 0.12));
  border-radius: 18px;
  padding: 0.35rem;
  background: var(--rp-teal-50, #eef9f7);
}

.mode-switch button {
  border: 0;
  border-radius: 14px;
  padding: 0.7rem 0.9rem;
  color: var(--rp-text-muted, #4a5654);
  background: transparent;
  cursor: pointer;
  font-weight: 800;
}

.mode-switch button.active {
  color: var(--rp-white, #fff);
  background: var(--rp-teal-800, #004d40);
}

label {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
  color: var(--rp-text-muted, #4a5654);
  font-size: 0.92rem;
  font-weight: 750;
}

input {
  width: 100%;
  border: 1px solid var(--rp-border-strong, rgba(0, 77, 64, 0.2));
  border-radius: 14px;
  outline: 0;
  padding: 0.85rem 0.95rem;
  color: var(--rp-text, #1a1f1e);
  background: var(--rp-white, #fff);
  font: inherit;
}

input:focus {
  border-color: var(--rp-teal-600, #1a7a6e);
  box-shadow: 0 0 0 4px var(--rp-focus, rgba(13, 107, 95, 0.2));
}

input::placeholder {
  color: var(--rp-text-soft, #6b7875);
}

.field-hint {
  margin: -0.35rem 0 0.85rem;
  color: var(--rp-text-soft, #6b7875);
  font-size: 0.82rem;
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

@media (max-width: 900px) {
  .auth-page {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .hero-panel {
    min-height: auto;
  }

  .hero-copy {
    padding: 4rem 0 2rem;
  }
}

@media (max-width: 560px) {
  .topline {
    align-items: flex-start;
    flex-direction: column;
  }

  .auth-card,
  .hero-panel {
    border-radius: 24px;
    padding: 1rem;
  }

  .auth-form {
    padding: 1.2rem;
  }
}
</style>
