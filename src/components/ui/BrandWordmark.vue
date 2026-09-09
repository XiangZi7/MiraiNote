<template>
  <!-- Rounded vector lettering keeps the reference shape without a system font dependency. -->
  <svg
    viewBox="0 0 704 116"
    fill="none"
    aria-hidden="true"
    focusable="false"
    class="brand-wordmark pointer-events-none block shrink-0"
  >
    <g
      class="brand-wordmark-name"
      stroke="currentColor"
      stroke-width="17"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M10 106V10L55 72L99 10V106" />
      <path d="M132 41V106M164 106V78C164 54 177 41 194 41H195" />
      <circle
        cx="245"
        cy="74"
        r="33"
      />
      <path d="M278 74V106M309 41V106" />
      <g
        fill="currentColor"
        stroke="none"
      >
        <circle
          cx="132"
          cy="10"
          r="9.5"
        />
        <circle
          cx="309"
          cy="10"
          r="9.5"
        />
      </g>
    </g>
    <g
      class="brand-wordmark-note"
      stroke="currentColor"
      stroke-width="17"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M355 106V10L425 106V10" />
      <circle
        cx="490"
        cy="74"
        r="33"
      />
      <path d="M558 18V86C558 100 565 106 578 106H590M540 41H586" />
      <path
        d="M622 74H688C688 55 674 41 655 41C636 41 622 55 622 74C622 93 636 107 655 107C666 107 677 102 683 94"
      />
    </g>
  </svg>
</template>

<style scoped>
.brand-wordmark {
  width: 80px;
  height: auto;
}

.brand-wordmark-name {
  /* Preserve the reference's gray-purple hue, with a readable tone on dark skins. */
  color: light-dark(#4d4769, #d8d2ed);
}

.brand-wordmark-note {
  color: #a179ff;
}
</style>
