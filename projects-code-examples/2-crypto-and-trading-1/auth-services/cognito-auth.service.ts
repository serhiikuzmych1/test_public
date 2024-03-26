@Injectable()
export class AuthService {
  private readonly userPool: CognitoUserPool;
  private readonly cognitoIdentityServiceProvider: CognitoUserSession;
  private readonly providerClient: CognitoIdentityProviderClient;

  constructor(private readonly configService: ConfigService) {
    this.userPool = new CognitoUserPool({
      UserPoolId: this.configService.getOrThrow("AWS_COGNITO_USER_POOL_ID"),
      ClientId: this.configService.getOrThrow("AWS_COGNITO_CLIENT_ID"),
    });

    this.providerClient = new CognitoIdentityProviderClient({
      region: this.configService.getOrThrow("AWS_DEFAULT_REGION"),
      credentials: {
        accessKeyId: this.configService.getOrThrow("AWS_ACCESS_KEY_ID"),
        secretAccessKey: this.configService.getOrThrow("AWS_SECRET_ACCESS_KEY"),
      },
    });
  }

  signUp(signUpRequestDto: SignUpDto): Promise<ISignUpResult> {
    const { email, password } = signUpRequestDto;
    return new Promise((resolve, reject) => {
      return this.userPool.signUp(
        email,
        password,
        [
          new CognitoUserAttribute({ Name: "email", Value: email }),
          new CognitoUserAttribute({ Name: "name", Value: "name" }),
        ],
        null,
        (err: any, result) => {
          if (err) {
            this.generateCognitoException(err, reject);
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  confirmRegistration(username: string, confirmationCode: string) {
    return new Promise((resolve, reject) => {
      const authUserData = {
        Username: username,
        Pool: this.userPool,
      };
      const cognitoUser = new CognitoUser(authUserData);

      return cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
        if (err) {
          this.generateCognitoException(err, reject);
        } else {
          resolve(result);
        }
      });
    });
  }

  login(loginRequestDto: LoginDto) {
    const { email, password } = loginRequestDto;

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const authUserData = {
      Username: email,
      Pool: this.userPool,
    };

    const cognitoUser = new CognitoUser(authUserData);

    return new Promise((resolve, reject) => {
      return cognitoUser.authenticateUser(authDetails, {
        onSuccess: (result: CognitoUserSession) => {
          resolve(result);
        },
        onFailure: (err) => {
          this.generateCognitoException(err, reject);
        },
      });
    });
  }

  async refreshToken(refreshToken: string) {
    try {
      const data = await this.providerClient.send(
        new AdminInitiateAuthCommand({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: this.configService.getOrThrow("AWS_COGNITO_CLIENT_ID"),
          UserPoolId: this.configService.getOrThrow("AWS_COGNITO_USER_POOL_ID"),
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        })
      );

      return {
        accessToken: {
          jwtToken: data.AuthenticationResult.AccessToken,
          payload: decode(data.AuthenticationResult.AccessToken),
        },
        idToken: {
          jwtToken: data.AuthenticationResult.IdToken,
          payload: decode(data.AuthenticationResult.IdToken),
        },
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  forgotPassword(forgotPasswordRequestDto: ForgotPasswordDto) {
    const { email } = forgotPasswordRequestDto;
    const authUserData = {
      Username: email,
      Pool: this.userPool,
    };

    const cognitoUser = new CognitoUser(authUserData);

    return new Promise((resolve, reject) => {
      return cognitoUser.forgotPassword({
        onSuccess: (result) => {
          resolve(result);
        },
        onFailure: (err) => {
          this.generateCognitoException(err, reject);
        },
      });
    });
  }

  confirmNewPassword(setPasswordRequestDto: SetPasswordDto) {
    const { newPassword, token, confirmationCode } = setPasswordRequestDto;

    const jwtPayload = decode(token) as {
      email: string;
    };

    const authUserData = {
      Username: jwtPayload.email,
      Pool: this.userPool,
    };

    const cognitoUser = new CognitoUser(authUserData);

    return new Promise((resolve, reject) => {
      cognitoUser.confirmPassword(confirmationCode, newPassword, {
        onSuccess: (result) => {
          resolve(result);
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }

  async changePassword(username: string, changePasswordData: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordData;

    const authUserData = {
      Username: username,
      Pool: this.userPool,
    };

    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: oldPassword,
    });

    const cognitoUser = new CognitoUser(authUserData);

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: () => {
          cognitoUser.changePassword(oldPassword, newPassword, (err, result) => {
            if (err) {
              this.generateCognitoException(err, reject);
              return;
            }
            resolve(result);
          });
        },
        onFailure: (err) => {
          this.generateCognitoException(err, reject);
        },
      });
    });
  }

  generateCognitoException(err: any, callback: any) {
    switch (err.code) {
      case "UserNotFoundException": {
        callback(
          new UserNotFoundException({
            $metadata: undefined,
            message: err.message,
          })
        );
        break;
      }
      case "LimitExceededException": {
        callback(
          new LimitExceededException({
            $metadata: undefined,
            message: err.message,
          })
        );
        break;
      }
      case "InvalidPasswordException": {
        callback(
          new InvalidPasswordException({
            $metadata: undefined,
            message: err.message,
          })
        );
        break;
      }
      case "NotAuthorizedException": {
        callback(
          new NotAuthorizedException({
            $metadata: undefined,
            message: err.message,
          })
        );
        break;
      }
      case "UserNotConfirmedException": {
        callback(
          new UserNotConfirmedException({
            $metadata: undefined,
            message: err.message,
          })
        );
        break;
      }
      case "TooManyFailedAttemptsException": {
        callback(
          new UserNotConfirmedException({
            $metadata: undefined,
            message: err.message,
          })
        );
        break;
      }
      case "UsernameExistsException": {
        callback(
          new UsernameExistsException({
            $metadata: undefined,
            message: err.message,
          })
        );
        break;
      }
      case "ExpiredCodeException": {
        callback(
          new ExpiredCodeException({
            $metadata: undefined,
            message: err.message,
          })
        );
        break;
      }
      default:
        callback(err);
    }
  }

  disableUser(id: string) {
    return this.providerClient.send(
      new AdminDisableUserCommand({
        UserPoolId: this.configService.getOrThrow("AWS_COGNITO_USER_POOL_ID"),
        Username: id,
      })
    );
  }
}
