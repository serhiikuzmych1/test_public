const app = express();
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(express.json({ limit: "30mb" }));
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());
app.use(cors());

app.use((req, res, next) => {
  if (!req.headers["x-requestid"]) {
    const requestId = uuid();
    req.requestId = requestId;
    req.headers["x-requestid"] = requestId;
  }
  next();
});

app.use(favicon(path.join(__dirname, "resources", "favicon.png")));

app.use(
  authenticationValidator().unless({
    path: [
      /(\/docs).*/,
      /(\/public).*/,
      /(\/transcription\/callback).*/,
      {
        url: "/v1/auth/token",
        methods: ["GET"],
      },
      {
        url: "/v1/auth/token/refresh",
        methods: ["GET"],
      },
      {
        url: "/v1/media-streaming/file-streams",
        methods: ["GET"],
      },
      {
        url: "/graphql",
        methods: ["GET", "POST"],
      },
      {
        url: "/_healthz",
        methods: ["GET"],
      },
    ],
  })
);

apolloServer.applyMiddleware({ app, cors: false });

app.use((_req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "script-src 'self' https://cdn.redoc.ly; worker-src 'self' 'unsafe-inline' * blob:;"
  );
  next();
});

app.use("/public/company_logo.png", express.static("docs/company_logo.png"));
app.use("/docs/generated/swagger.yaml", express.static("docs/swagger/generated/swagger.yaml"));
app.use("/docs", express.static("docs"));

app.use("/coverage", express.static("coverage/"));
app.use("/_healthz", (_req, res) => {
  res.sendStatus(200);
});

app.use("/v1/flag", async (req, res) => {
  const crmCompanyId = req.body.crmCompanyId || req.user.crmCompanyId;
  let organizationId;
  try {
    const [org] = (await getOrganization("", crmCompanyId)).data.organizations;
    organizationId = org.id;
  } catch (error) {
    // we can just ignore this if it doesn't work
  }
  const featureFlagName = req.query.name || "ScreenRecording";
  const isEnabled = unleash.isEnabled(featureFlagName, {
    crmCompanyId,
    ...(organizationId ? { organizationId } : {}),
  });

  return res.status(200).send({ isEnabled: isEnabled ? 1 : 0 });
});

app.use("/v1/graphql", graphqlHttp({ schema }));
app.use("/v1", routes);

export default app;
