const PRIMARY_COLOR = '#1e4f78';
const BRAND_NAME = 'ORQEN';
const DEFAULT_PORTAL_URL = 'https://orqenthetracker.vercel.app';

function getBaseLayout(title: string, subheader: string, contentHtml: string, actionText?: string, actionUrl?: string): string {
  const targetUrl = actionUrl || process.env.FRONTEND_URL || DEFAULT_PORTAL_URL;
  
  const actionButtonHtml = actionText ? `
    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="${targetUrl}" style="display: inline-block; background-color: ${PRIMARY_COLOR}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; letter-spacing: 0.02em; box-shadow: 0 2px 6px rgba(30,79,120,0.25);">${actionText}</a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color: ${PRIMARY_COLOR}; padding: 24px 28px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-family: monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #93c5fd; font-weight: 700; margin-bottom: 4px;">${BRAND_NAME} Operations & Maintenance Gateway</div>
                    <div style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; line-height: 1.3;">${title}</div>
                    ${subheader ? `<div style="color: #cbd5e1; font-size: 13px; margin-top: 4px;">${subheader}</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 20px;">
              ${contentHtml}
              ${actionButtonHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 28px; text-align: center;">
              <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                This is an automated operational notification dispatched by <strong>${BRAND_NAME} Society Management Suite</strong>.<br/>
                For maintenance queries or live status updates, access <a href="${targetUrl}" style="color: ${PRIMARY_COLOR}; text-decoration: underline;">${targetUrl.replace(/^https?:\/\//, '')}</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function buildOtpEmail(code: string, purpose: string, expiresInMinutes = 10): { subject: string; text: string; html: string } {
  const subject = `${BRAND_NAME} Verification Code: ${code}`;
  const text = `Your ${BRAND_NAME} ${purpose} verification code is: ${code}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nAccess portal: ${process.env.FRONTEND_URL || DEFAULT_PORTAL_URL}`;
  
  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
      Please use the following 6-digit security code to complete your <strong>${purpose}</strong>:
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.28em; color: ${PRIMARY_COLOR}; background-color: #eff6ff; border: 2px dashed #93c5fd; border-radius: 8px; padding: 12px 24px;">
        ${code}
      </span>
    </div>
    <div style="background-color: #f8fafc; border-left: 4px solid ${PRIMARY_COLOR}; border-radius: 4px; padding: 12px 16px; margin-top: 20px;">
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
        This code is valid for <strong>${expiresInMinutes} minutes</strong> and can only be used once. If you did not initiate this request, you can safely disregard this email.
      </p>
    </div>
  `;

  return {
    subject,
    text,
    html: getBaseLayout('Security Verification Code', 'Account Authorization', content, 'Open Security Portal'),
  };
}

export function buildResidentVerificationAdminEmail(params: {
  name: string;
  flatNumber: string;
  email: string;
  phone?: string | null;
  occupancyType?: string | null;
  documentType?: string | null;
}): { subject: string; text: string; html: string } {
  const portalUrl = process.env.FRONTEND_URL || DEFAULT_PORTAL_URL;
  const subject = `Resident Verification Required — Flat ${params.flatNumber} (${params.name})`;
  const text = `A new resident has registered and requested flat verification:\n• Name: ${params.name}\n• Flat Number: ${params.flatNumber}\n• Email: ${params.email}\n• Phone: ${params.phone || 'N/A'}\n• Occupancy: ${params.occupancyType || 'OWNER'}\n• Document: ${params.documentType || 'AADHAAR'}\n\nPlease review on the admin verification queue: ${portalUrl}`;

  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
      Dear Society Committee Administrator,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      A new resident has submitted registration details with flat proof documentation and is awaiting committee verification:
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; width: 140px; color: #64748b;">Resident Name:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${params.name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Flat / Unit Number:</td>
          <td style="padding: 6px 0; font-weight: 700; color: ${PRIMARY_COLOR}; font-family: monospace; font-size: 14px;">Flat ${params.flatNumber}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Email Address:</td>
          <td style="padding: 6px 0;">${params.email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Phone:</td>
          <td style="padding: 6px 0;">${params.phone || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Occupancy Status:</td>
          <td style="padding: 6px 0;"><span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">${params.occupancyType || 'OWNER'}</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Proof Document:</td>
          <td style="padding: 6px 0;">${params.documentType || 'AADHAAR'} (Attached for Preview)</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
      Please inspect the attached proof in the Admin Resident Directory to verify flat ownership and approve the account.
    </p>
  `;

  return {
    subject,
    text,
    html: getBaseLayout(`Flat Verification: Flat ${params.flatNumber}`, 'Resident Registration Queue', content, 'Review & Verify Resident', `${portalUrl}/residents`),
  };
}

export function buildNoticeBroadcastEmail(params: {
  title: string;
  content: string;
  isImportant: boolean;
  startFormatted: string;
  endFormatted: string;
  durationTag?: string | null;
  residentName: string;
  flatNumber: string;
}): { subject: string; text: string; html: string } {
  const portalUrl = process.env.FRONTEND_URL || DEFAULT_PORTAL_URL;
  const urgencyTag = params.isImportant ? 'High Priority / Urgent' : 'General Notice';
  const subject = params.isImportant
    ? `Urgent Announcement: ${params.title} — ${BRAND_NAME}`
    : `Society Announcement: ${params.title} — ${BRAND_NAME}`;
  
  const text = `Dear ${params.residentName} (Flat ${params.flatNumber}),\n\nAn official public announcement has been issued by the Society Management Committee:\n\n• Subject: ${params.title}\n• Urgency: ${urgencyTag}\n• Schedule: ${params.startFormatted} to ${params.endFormatted}\n• Details:\n${params.content}\n\nView details: ${portalUrl}`;

  const urgencyBadge = params.isImportant
    ? `<span style="background-color: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase;">High Priority Advisory</span>`
    : `<span style="background-color: #f1f5f9; color: #475569; padding: 3px 10px; border-radius: 4px; font-weight: 600; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase;">General Society Notice</span>`;

  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
      Dear <strong>${params.residentName}</strong> (Flat ${params.flatNumber}),
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      The Society Management Committee has issued the following official public advisory for all residents:
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${params.isImportant ? '#b83a32' : PRIMARY_COLOR}; border-radius: 8px; padding: 18px; margin: 18px 0;">
      <div style="margin-bottom: 10px;">${urgencyBadge}</div>
      <h3 style="margin: 0 0 10px 0; font-size: 17px; color: #0f172a; font-weight: 700;">${params.title}</h3>
      <p style="margin: 0 0 14px 0; font-size: 14px; color: #334155; line-height: 1.6;">${params.content.replace(/\n/g, '<br/>')}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 14px 0;" />
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #64748b;">
        <tr>
          <td style="padding: 3px 0; width: 130px; font-weight: 600;">Approx. Window:</td>
          <td style="padding: 3px 0; color: #0f172a; font-weight: 600;">${params.startFormatted} &mdash; ${params.endFormatted}</td>
        </tr>
        ${params.durationTag ? `
        <tr>
          <td style="padding: 3px 0; font-weight: 600;">Estimated Duration:</td>
          <td style="padding: 3px 0; color: ${PRIMARY_COLOR}; font-family: monospace; font-weight: 700;">${params.durationTag}</td>
        </tr>` : ''}
      </table>
    </div>
  `;

  return {
    subject,
    text,
    html: getBaseLayout(params.title, 'Public Society Announcement', content, 'View Society Noticeboard', `${portalUrl}/notices`),
  };
}

export function buildComplaintStatusUpdateEmail(params: {
  residentName: string;
  flatNumber: string;
  complaintId: string;
  categoryName: string;
  newStatus: string;
  notes?: string | null;
  actorName?: string;
}): { subject: string; text: string; html: string } {
  const portalUrl = process.env.FRONTEND_URL || DEFAULT_PORTAL_URL;
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    OPEN: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    IN_PROGRESS: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
    RESOLVED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  };

  const style = statusColors[params.newStatus] || statusColors.OPEN;
  const subject = `Ticket #${params.complaintId.slice(0, 8).toUpperCase()} Status Updated: ${params.newStatus} — ${BRAND_NAME}`;
  const text = `Dear ${params.residentName},\n\nYour maintenance ticket for Flat ${params.flatNumber} (${params.categoryName}) has been updated to ${params.newStatus}.\n\nNotes: ${params.notes || 'Status updated by Operations'}\n\nView details: ${portalUrl}`;

  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
      Dear <strong>${params.residentName}</strong>,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      Your maintenance ticket has been updated by the Operations Committee:
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; width: 140px; color: #64748b;">Ticket Reference:</td>
          <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #0f172a;">#${params.complaintId.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Category:</td>
          <td style="padding: 6px 0; font-weight: 600;">${params.categoryName} (Flat ${params.flatNumber})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Current Status:</td>
          <td style="padding: 6px 0;">
            <span style="background-color: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}; padding: 3px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; letter-spacing: 0.04em;">
              ${params.newStatus}
            </span>
          </td>
        </tr>
        ${params.notes ? `
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748b; vertical-align: top;">Audit Notes:</td>
          <td style="padding: 6px 0; color: #475569; line-height: 1.5;">${params.notes}</td>
        </tr>` : ''}
      </table>
    </div>
  `;

  return {
    subject,
    text,
    html: getBaseLayout(`Maintenance Status: ${params.newStatus}`, `Ticket #${params.complaintId.slice(0, 8).toUpperCase()}`, content, 'Track Ticket Progress', portalUrl),
  };
}
