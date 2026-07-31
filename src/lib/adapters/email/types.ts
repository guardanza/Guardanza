export interface ContactInviteEmail {
  to: string;
  contactFullName: string;
  organizationName: string;
  contactRoleLabel: string;
  acceptUrl: string;
  expiresAt: Date;
}

export interface EmailProvider {
  /** Send the "you were invited to Guardanza's contact book" email. */
  sendContactInvite(message: ContactInviteEmail): Promise<void>;
}
