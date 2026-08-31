export interface ContactInviteEmail {
  to: string;
  contactFullName: string;
  organizationName: string;
  contactRoleLabel: string;
  acceptUrl: string;
  expiresAt: Date;
}

export interface CandidateParticipantInviteEmail {
  to: string;
  participantFullName: string;
  participantType: "titular" | "codeudor" | "coarrendatario";
  propertyAddress: string;
  inviterName: string;
  acceptUrl: string;
  expiresAt: Date;
}

export interface EmailProvider {
  /** Send the "you were invited to Guardanza's contact book" email. */
  sendContactInvite(message: ContactInviteEmail): Promise<void>;
  /** Send the "you were invited to present papers for a property candidacy" email. */
  sendCandidateParticipantInvite(message: CandidateParticipantInviteEmail): Promise<void>;
}
