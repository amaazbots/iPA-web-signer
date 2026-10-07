export const IPA_MAX_SIZE_MB = 200;
export const IPA_MAX_SIZE_BYTES = IPA_MAX_SIZE_MB * 1024 * 1024;
export const IPA_MAX_ENTRY_BYTES = 256 * 1024 * 1024;
export const IPA_MAX_UNPACKED_MB = 512;
export const IPA_MAX_UNPACKED_BYTES = IPA_MAX_UNPACKED_MB * 1024 * 1024;
// Keep each installation request below the host's individual request limit.
export const IPA_SINGLE_UPLOAD_BYTES = 90 * 1024 * 1024;
export const IPA_UPLOAD_PART_BYTES = 20 * 1024 * 1024;
