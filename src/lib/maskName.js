// Temporary placeholder: display listing name fields as a dash "-" without
// touching the original data stored in the database.
//
// This only changes front-end display. Search, filtering and sorting keep
// using the real stored values, and the edit/admin panels still show and let
// you edit the real names.
//
// To reveal the real names again once you've updated them, set this to false
// (or ask Base44 to turn off the placeholder).
export const NAME_MASK_ENABLED = false;

export const maskName = (name) => (NAME_MASK_ENABLED && name ? "-" : name);