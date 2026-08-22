export type IdentityDocumentFixture = {
  name: string;
  title: string;
  body: string;
  url: string;
};

export const verifiedIdentityFixtures: readonly IdentityDocumentFixture[] = [
  {
    name: "Swedbank Latvia canonical domain",
    title: "Swedbank Latvia",
    body: "<header>Swedbank</header><h1>Internet banking</h1>",
    url: "https://www.swedbank.lv/private"
  },
  {
    name: "SEB Latvia canonical domain",
    title: "SEB banka",
    body: "<header>SEB</header><h1>Internet bank</h1>",
    url: "https://login.seb.lv/"
  },
  {
    name: "Citadele canonical domain",
    title: "Citadele online bank",
    body: "<header>Citadele</header><h1>Online bank</h1>",
    url: "https://online.citadele.lv/"
  },
  {
    name: "Luminor canonical domain",
    title: "Luminor internet bank",
    body: "<header>Luminor Bank</header><h1>Internet bank</h1>",
    url: "https://ib.luminor.lv/"
  },
  {
    name: "Rietumu official login domain",
    title: "iRietumu",
    body: "<header>Rietumu Banka</header><h1>Internet bank</h1>",
    url: "https://i.rietumu.lv/"
  }
];

export const benignIdentityContextFixtures: readonly IdentityDocumentFixture[] =
  [
    {
      name: "bank news article",
      title: "News: Swedbank quarterly results",
      body: "<main><article><h1>Swedbank quarterly results</h1></article></main>",
      url: "https://news.example.test/article"
    },
    {
      name: "bank comparison",
      title: "SEB versus Citadele comparison",
      body: "<main><h1>Compare SEB and Citadele</h1></main>",
      url: "https://compare.example.test/banks"
    },
    {
      name: "payment provider",
      title: "Checkout payment providers",
      body: '<main><h1>Choose a payment provider</h1><img alt="Pay with Citadele"></main>',
      url: "https://merchant.example.test/checkout"
    },
    {
      name: "OAuth SSO chooser",
      title: "Single sign-on",
      body: "<main><h1>Continue with SEB</h1><button>Continue with SEB</button></main>",
      url: "https://workspace.example.test/oauth"
    },
    {
      name: "customer-logo strip",
      title: "Our customers",
      body: '<section aria-label="Customer logos"><img alt="Swedbank"><img alt="Luminor"></section>',
      url: "https://vendor.example.test/customers"
    },
    {
      name: "bank documentation",
      title: "Documentation guide for Citadele exports",
      body: "<main><article><h1>Citadele integration guide</h1></article></main>",
      url: "https://docs.example.test/citadele"
    }
  ];

export const mismatchedBankLoginFixture: IdentityDocumentFixture = {
  name: "synthetic mismatched Swedbank login",
  title: "Swedbank secure login",
  body: '<header>Swedbank</header><main><h1>Sign in to Swedbank</h1><form><label>User <input autocomplete="username"></label><label>Password <input type="password" value="fake-secret-never-read"></label><button type="button">Sign in</button></form></main>',
  url: "https://login.example.test/"
};
