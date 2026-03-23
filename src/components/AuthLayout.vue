<template>
  <div class="auth-page">
    <div class="container-fluid p-0">
      <div class="row g-0">
        <!-- Left Column - Auth Form Area -->
        <div class="col-xxl-3 col-lg-4 col-md-5">
          <div class="auth-full-page-content d-flex p-sm-5 p-4">
            <div class="w-100">
              <div class="d-flex flex-column h-100">
                <!-- Logo -->
                <div class="mb-4 mb-md-5 text-center">
                  <a href="#" class="d-block auth-logo" @click.prevent>
                    <img src="https://node1.phpcoin.net/apps/common/img/logo.png" alt="PHP Coin" height="48"> <span class="logo-txt">PHP Coin</span>
                  </a>
                </div>

                <!-- Auth Content Slot (top-aligned; my-auto was vertically centering the form) -->
                <div class="auth-content flex-grow-1">
                  <slot />
                </div>

                <div class="mt-4 pt-3 border-top text-center px-1">


                  <p class="auth-legacy-wallet-note text-muted mb-0 lh-base">
                    Switch back to the
                    <a
                      :href="legacyWebWalletUrl"
                      class="auth-legacy-wallet-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >legacy web wallet</a>.
                  </p>
                </div>

                <!-- Footer -->
                <div class="mt-4 mt-md-5 text-center auth-footer-note">
                  <p class="mb-0">
                    © {{ new Date().getFullYear() }} PHP Coin. <span class="ms-1">Version</span><span class="badge bg-secondary-subtle text-secondary align-middle fs-6 fw-normal ms-2">{{ appVersion }}</span>
                    <a href="#" class="ms-2 text-muted text-decoration-underline" @click.prevent="showChangelog = true">Changelog</a>
                    · Crafted with <i class="mdi mdi-heart text-danger"></i> by PHP Coin Team
                  </p>
                </div>
              </div>
            </div>
          </div>
          <!-- end auth full page content -->
        </div>
        <!-- end col -->

        <!-- Right Column - Animated Background with Carousel -->
        <div class="col-xxl-9 col-lg-8 col-md-7">
          <div class="auth-bg pt-md-5 p-4 d-flex">
            <div class="bg-overlay bg-primary"></div>
            <ul class="bg-bubbles">
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
            </ul>
            <!-- end bubble effect -->
            <div class="row justify-content-center align-items-center">
              <div class="col-xl-7">
                <div class="p-0 p-sm-4 px-xl-0">
                  <div id="reviewcarouselIndicators" class="carousel slide" data-bs-ride="carousel">
                    <div class="carousel-indicators carousel-indicators-rounded justify-content-start ms-0 mb-0">
                      <button type="button" data-bs-target="#reviewcarouselIndicators" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
                      <button type="button" data-bs-target="#reviewcarouselIndicators" data-bs-slide-to="1" aria-label="Slide 2"></button>
                      <button type="button" data-bs-target="#reviewcarouselIndicators" data-bs-slide-to="2" aria-label="Slide 3"></button>
                    </div>
                    <!-- end carouselIndicators -->
                    <div class="carousel-inner">
                      <div class="carousel-item active">
                        <div class="testi-contain text-white">
                          <i class="bx bxs-quote-alt-left text-success display-6"></i>
                          <h4 class="mt-4 fw-medium lh-base text-white">"Decentralization is at the heart of PHP Coin. Your keys, your coins—no middleman, no single point of failure. True financial sovereignty for everyone."</h4>
                          <div class="mt-4 pt-3 pb-5">
                            <div class="d-flex align-items-start">
                              <div class="flex-shrink-0">
                                <span class="avatar-md rounded-circle bg-light d-flex align-items-center justify-content-center"><i class="bx bxl-bitcoin font-size-24 text-primary"></i></span>
                              </div>
                              <div class="flex-grow-1 ms-3 mb-4">
                                <h5 class="font-size-18 text-white">PHP Coin</h5>
                                <p class="mb-0 text-white-50">Decentralized &amp; community-driven</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="carousel-item">
                        <div class="testi-contain text-white">
                          <i class="bx bxs-quote-alt-left text-success display-6"></i>
                          <h4 class="mt-4 fw-medium lh-base text-white">"Fast, low-fee transactions on a network built for the real world. Send and receive PHP with confidence—secure, transparent, and always in your control."</h4>
                          <div class="mt-4 pt-3 pb-5">
                            <div class="d-flex align-items-start">
                              <div class="flex-shrink-0">
                                <span class="avatar-md rounded-circle bg-light d-flex align-items-center justify-content-center"><i class="bx bx-wallet font-size-24 text-success"></i></span>
                              </div>
                              <div class="flex-grow-1 ms-3 mb-4">
                                <h5 class="font-size-18 text-white">PHP Coin Wallet</h5>
                                <p class="mb-0 text-white-50">Your keys, your coins</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="carousel-item">
                        <div class="testi-contain text-white">
                          <i class="bx bxs-quote-alt-left text-success display-6"></i>
                          <h4 class="mt-4 fw-medium lh-base text-white">"Join a community that values openness and simplicity. PHP Coin—crafted for developers, miners, and users who believe in fair, accessible cryptocurrency."</h4>
                          <div class="mt-4 pt-3 pb-5">
                            <div class="d-flex align-items-start">
                              <div class="flex-shrink-0">
                                <span class="avatar-md rounded-circle bg-light d-flex align-items-center justify-content-center"><i class="bx bx-group font-size-24 text-info"></i></span>
                              </div>
                              <div class="flex-grow-1 ms-3 mb-4">
                                <h5 class="font-size-18 text-white">PHP Coin Team</h5>
                                <p class="mb-0 text-white-50">Community first</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- end carousel-inner -->
                  </div>
                  <!-- end review carousel -->
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- end col -->
      </div>
      <!-- end row -->
    </div>
    <!-- end container fluid -->

    <ChangelogModal v-model="showChangelog" />
  </div>
</template>

<script>
import { ref } from 'vue'
import { APP_VERSION } from '../constants/appMeta'
import ChangelogModal from './ChangelogModal.vue'

/** Classic PHP multi-wallet entry (relative to site origin). */
const LEGACY_WEB_WALLET_URL =
  '/dapps.php?url=PeC85pqFgRxmevonG6diUwT4AfF7YUPSm3/wallet'

export default {
  name: 'AuthLayout',
  components: { ChangelogModal },
  setup() {
    const showChangelog = ref(false)
    return {
      appVersion: APP_VERSION,
      showChangelog,
      legacyWebWalletUrl: LEGACY_WEB_WALLET_URL
    }
  }
}
</script>

<style scoped>
.auth-legacy-wallet-note,
.auth-footer-note {
  font-size: 1rem;
}

.auth-legacy-wallet-link {
  color: #5156be;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.15em;
  text-decoration-thickness: 1px;
}

.auth-legacy-wallet-link:hover {
  color: #3d4299;
}
</style>

