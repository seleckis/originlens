export const benignUrlFixtures = [
  "https://www.example.co.uk/news?never-rendered=true",
  "https://mañana.com/",
  "https://login.example.test/"
] as const;

export const suspiciousUrlFixtures = [
  "https://bank@example.test:8443/",
  "http://192.0.2.7/",
  "https://pаypal.example.test/",
  "https://a.b.c.d.paypal.example.test/"
] as const;
