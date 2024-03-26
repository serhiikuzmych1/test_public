@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private connectionService: ConnectionService,
    private readonly userMapper: UserMapper
  ) {}

  getSignedAccessToken(payload: Payload): string {
    return this.jwtService.sign(payload);
  }

  findAuthInfoByUserId(userId: number): Promise<AuthInfoModel | null> {
    const db = this.connectionService.db;

    return db.query.authInfo.findFirst({
      where: (authInfo, { eq }) => eq(authInfo.userId, userId),
    });
  }

  async createAuthInfo(dto: CreateAuthInfo): Promise<AuthInfoModel | null> {
    const db = this.connectionService.db;

    const hashedAccessToken = await hash(dto.accessToken);

    const authInfoExists = await this.findAuthInfoByUserId(dto.userId);
    let authInfoModel: AuthInfoModel | null;

    if (!authInfoExists) {
      const result = await db
        .insert(authInfo)
        .values({
          userId: dto.userId,
          hashedAccessToken,
        })
        .returning();

      authInfoModel = result.length ? result[0] : null;
    } else {
      const result = await db
        .update(authInfo)
        .set({
          hashedAccessToken,
        })
        .where(eq(authInfo.userId, dto.userId))
        .returning();

      authInfoModel = result.length ? result[0] : null;
    }

    return authInfoModel;
  }

  async removeAuthInfo(userId: number): Promise<UserMessageResponse> {
    const db = this.connectionService.db;

    await db.delete(authInfo).where(eq(authInfo.userId, userId));

    return { message: "User was signed out!" };
  }

  async registerUser(userInput: RegisterUserDto): Promise<UserLoginResponse> {
    const db = this.connectionService.db;

    if (userInput.password !== userInput.repeatPassword) {
      throw new UserBadRequestException(`Passwords do not match`);
    }

    const userExists = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.email, userInput.email),
    });
    if (userExists) {
      throw new UserBadRequestException(`User with email ${userInput.email} already exists`);
    }

    const hashedPassword = await hash(userInput.password);

    const [user] = await db
      .insert(users)
      .values({
        email: userInput.email,
        hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const accessToken = this.getSignedAccessToken({
      email: user.email,
    });

    await this.createAuthInfo({
      accessToken,
      userId: user.id,
    });

    return this.userMapper.toUserLoginResponse(user, accessToken);
  }

  async loginUser(userInput: LoginUserDto): Promise<UserLoginResponse> {
    const db = this.connectionService.db;

    const user = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.email, userInput.email),
    });

    if (!user) {
      throw new UserNotFoundException(`User with email ${userInput.email} not found`);
    }

    const isPasswordValid = await verify(user.hashedPassword, userInput.password);

    if (!isPasswordValid) {
      throw new SignInBadRequestException(`Password is invalid`);
    }

    const accessToken = this.getSignedAccessToken({
      email: user.email,
    });

    await this.createAuthInfo({
      accessToken,
      userId: user.id,
    });

    return this.userMapper.toUserLoginResponse(user, accessToken);
  }
}
