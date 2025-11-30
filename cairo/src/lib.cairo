// ZCLAIM Bridge - Main Library
// Privacy-preserving Zcash to Starknet bridge
//
// STATUS: Compiles with token + relay modules
// TODO: Manual review needed for vault, bridge, crypto modules

pub mod token {
    pub mod wzec;
}

pub mod relay {
    pub mod types;
    pub mod relay_system;
}

// TODO: Uncomment after fixing Cairo 2.8 compatibility issues
// pub mod vault {
//     pub mod types;
//     pub mod registry;
// }

// pub mod bridge {
//     pub mod mint;
//     pub mod burn;
//     pub mod zclaim;
// }

// pub mod crypto {
//     pub mod blake2b;
//     pub mod merkle;
// }
