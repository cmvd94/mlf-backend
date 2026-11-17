// Active Admin Access Scope.
// Follows hierarchical structure: Country -> Zone -> State -> District -> pincodes[]

export const AdminAccessScope = {
  India: {
    SouthZone: {
      TamilNadu: {
        Coimbatore: {
          pincodes: [],
        },
        Tiruppur: {
          pincodes: [],
        },
        Chennai: {
          pincodes: [],
        },
      },
      Kerala: {
        Thrissur: {
          pincodes: [],
        },
      },
    },
    NorthZone: {
      Delhi: {
        DelhiNCR: {
          pincodes: [],
        },
      },
    },
  },
  USA: {
    WestZone: {
      California: {
        SanFrancisco: {
          pincodes: [],
        },
      },
    },
  },
};
