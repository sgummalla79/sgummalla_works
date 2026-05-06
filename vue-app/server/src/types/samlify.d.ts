declare module "samlify" {
  export interface BindingContext {
    id: string;
    context: string;
  }

  export interface ServiceProviderOptions {
    entityID: string;
    assertionConsumerService: Array<{
      Binding: string;
      Location: string;
    }>;
  }

  export interface IdentityProviderOptions {
    entityID: string;
    privateKey: string;
    signingCert: string;
    isAssertionEncrypted?: boolean;
    singleSignOnService?: Array<{
      Binding: string;
      Location: string;
    }>;
    loginResponseTemplate?: {
      context: string;
      attributes?: Array<{
        name: string;
        valueTag: string;
        nameFormat: string;
        valueXsiType: string;
      }>;
    };
  }

  export interface ServiceProvider {
    getMetadata(): string;
  }

  export interface IdentityProvider {
    getMetadata(): string;
    createLoginResponse(
      sp: ServiceProvider,
      requestInfo: Record<string, unknown>,
      binding: string,
      user: Record<string, string>,
      customTagReplacement?: (template: string) => BindingContext,
      encryptThenSign?: boolean,
      relayState?: string,
    ): Promise<BindingContext>;
  }

  export function ServiceProvider(
    options: ServiceProviderOptions,
  ): ServiceProvider;
  export function IdentityProvider(
    options: IdentityProviderOptions,
  ): IdentityProvider;
  export function setSchemaValidator(validator: {
    validate: (xml: string) => Promise<string>;
  }): void;
}
