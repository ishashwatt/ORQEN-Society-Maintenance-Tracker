const PRIMARY_GRADIENT = 'linear-gradient(135deg, #0b192c 0%, #1e3e62 50%, #000000 100%)';
const ACCENT_COLOR = '#008dda';
const BRAND_NAME = 'ORQEN';
const DEFAULT_PORTAL_URL = 'https://orqenthetracker.vercel.app';

function getBaseLayout(title: string, subheader: string, contentHtml: string, actionText?: string, actionUrl?: string): string {
  const targetUrl = actionUrl || process.env.FRONTEND_URL || DEFAULT_PORTAL_URL;
  
  const actionButtonHtml = actionText ? `
    <div style="text-align: center; margin: 32px 0 16px;">
      <a href="${targetUrl}" style="display: inline-block; background: #1e4f78; background: linear-gradient(135deg, #1e4f78 0%, #0f2c4d 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.03em; text-transform: uppercase; box-shadow: 0 4px 14px rgba(15,44,77,0.35); border: 1px solid rgba(255,255,255,0.1);">${actionText}</a>
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
<body style="margin: 0; padding: 0; background-color: #0b1320; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b1320; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.35); border: 1px solid #1e293b;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: #0f172a; background: ${PRIMARY_GRADIENT}; padding: 32px 32px 28px; text-align: left; border-bottom: 3px solid ${ACCENT_COLOR};">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: rgba(0, 141, 218, 0.2); border: 1px solid rgba(0, 141, 218, 0.4); border-radius: 6px; padding: 4px 12px; font-family: monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #38bdf8; font-weight: 700;">
                          ${BRAND_NAME} Society Operations
                        </td>
                      </tr>
                    </table>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 14px 0 0; line-height: 1.3; letter-spacing: -0.01em;">${title}</h1>
                    ${subheader ? `<p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0; line-height: 1.4;">${subheader}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #ffffff;">
              ${contentHtml}
              ${actionButtonHtml}
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 32px 24px; background-color: #ffffff;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; text-align: left;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 12px; color: #64748b; line-height: 1.5;">
                      <strong style="color: #334155;">Security Notice:</strong> Never share your verification code or login credentials with anyone. Society administrators will never ask for your password.
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 22px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0 0 6px;">
                Official Operational Notice &bull; <strong>${BRAND_NAME} Residential Management Gateway</strong>
              </p>
              <p style="font-size: 11px; color: #64748b; margin: 0;">
                Live Management Portal: <a href="${targetUrl}" style="color: #38bdf8; text-decoration: none; font-weight: 600;">${targetUrl.replace(/^https?:\/\//, '')}</a>
              </p>
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
  
  const digits = code.split('');
  const digitBoxes = digits.map(d => `
    <td align="center" style="width: 44px; height: 52px; background: #ffffff; border: 2px solid #0284c7; border-radius: 8px; font-family: monospace; font-size: 26px; font-weight: 800; color: #0369a1; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.15);">
      ${d}
    </td>
  `).join('<td style="width: 6px;"></td>');

  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
      Hello,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
      You recently requested a security verification code for <strong>${purpose}</strong> on the ORQEN Society Maintenance Portal. Please enter this code to proceed:
    </p>

    <!-- Stylized OTP Card -->
    <div style="background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 12px; padding: 24px 16px; margin: 20px 0; text-align: center;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #0284c7; margin-bottom: 14px;">
        One-Time Passcode
      </div>
      <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          ${digitBoxes}
        </tr>
      </table>
      
      <!-- Quick Copy Code Block -->
      <div style="margin-top: 18px;">
        <div style="display: inline-block; background-color: #ffffff; border: 1px dashed #0284c7; border-radius: 8px; padding: 8px 18px;">
          <span style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-right: 8px;">Direct Copy Code:</span>
          <span style="font-family: monospace; font-size: 20px; font-weight: 800; letter-spacing: 4px; color: #0369a1; user-select: all; -webkit-user-select: all; -moz-user-select: all; cursor: pointer;">${code}</span>
        </div>
      </div>

      <div style="margin-top: 12px; font-size: 12px; color: #0369a1; font-weight: 600;">
        Valid for the next ${expiresInMinutes} minutes &bull; Single use only
      </div>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      If you did not make this request, you can safely ignore this email. Your account remains secure.
    </p>
  `;

  return {
    subject,
    text,
    html: getBaseLayout('Security Verification Code', `Action Required: ${purpose}`, content, 'Open ORQEN Portal'),
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
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 12px;">
      Dear Society Committee Administrator,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
      A new resident has registered on the portal and submitted flat ownership documentation for committee verification:
    </p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
        <tr>
          <td style="padding: 7px 0; font-weight: 600; width: 140px; color: #64748b;">Resident Name:</td>
          <td style="padding: 7px 0; font-weight: 700; color: #0f172a; font-size: 14px;">${params.name}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; font-weight: 600; color: #64748b;">Flat / Unit Number:</td>
          <td style="padding: 7px 0; font-weight: 700; color: #0284c7; font-family: monospace; font-size: 15px;">Flat ${params.flatNumber}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; font-weight: 600; color: #64748b;">Registered Email:</td>
          <td style="padding: 7px 0; color: #334155;">${params.email}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; font-weight: 600; color: #64748b;">Contact Phone:</td>
          <td style="padding: 7px 0; color: #334155;">${params.phone || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; font-weight: 600; color: #64748b;">Occupancy Status:</td>
          <td style="padding: 7px 0;">
            <span style="background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; padding: 3px 10px; border-radius: 5px; font-weight: 700; font-size: 11px; letter-spacing: 0.04em;">
              ${params.occupancyType || 'OWNER'}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 7px 0; font-weight: 600; color: #64748b;">Proof Attached:</td>
          <td style="padding: 7px 0; color: #0f172a; font-weight: 600;">${params.documentType || 'AADHAAR'} (Ready for Lightbox Preview)</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 16px 0 0;">
      Please inspect the attached proof document in the Resident Directory to approve or decline the resident profile.
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
    ? `<span style="background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;">High Priority Advisory</span>`
    : `<span style="background-color: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; padding: 4px 12px; border-radius: 6px; font-weight: 600; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;">General Society Notice</span>`;

  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 12px;">
      Dear <strong>${params.residentName}</strong> (Flat ${params.flatNumber}),
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
      The Society Management Committee has issued the following official public advisory for all residents:
    </p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid ${params.isImportant ? '#dc2626' : '#0284c7'}; border-radius: 10px; padding: 22px; margin: 20px 0;">
      <div style="margin-bottom: 12px;">${urgencyBadge}</div>
      <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a; font-weight: 700;">${params.title}</h2>
      <div style="font-size: 14px; color: #334155; line-height: 1.7; margin-bottom: 16px;">${params.content.replace(/\n/g, '<br/>')}</div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #64748b;">
        <tr>
          <td style="padding: 4px 0; width: 140px; font-weight: 600;">Approx. Active Window:</td>
          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${params.startFormatted} &mdash; ${params.endFormatted}</td>
        </tr>
        ${params.durationTag ? `
        <tr>
          <td style="padding: 4px 0; font-weight: 600;">Estimated Duration:</td>
          <td style="padding: 4px 0; color: #0284c7; font-family: monospace; font-weight: 700;">${params.durationTag}</td>
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
  const subject = `Ticket #${params.complaintId.slice(0, 8).toUpperCase()} Status: ${params.newStatus} — ${BRAND_NAME}`;
  const text = `Dear ${params.residentName},\n\nYour maintenance ticket for Flat ${params.flatNumber} (${params.categoryName}) has been updated to ${params.newStatus}.\n\nNotes: ${params.notes || 'Status updated by Operations'}\n\nView details: ${portalUrl}`;

  const content = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 12px;">
      Dear <strong>${params.residentName}</strong>,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
      Your maintenance ticket has received a status update from the Operations Committee:
    </p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
        <tr>
          <td style="padding: 7px 0; font-weight: 600; width: 140px; color: #64748b;">Ticket Reference:</td>
          <td style="padding: 7px 0; font-family: monospace; font-weight: 700; color: #0f172a;">#${params.complaintId.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; font-weight: 600; color: #64748b;">Category & Flat:</td>
          <td style="padding: 7px 0; font-weight: 600; color: #334155;">${params.categoryName} &bull; Flat ${params.flatNumber}</td>
        </tr>
        <tr>
          <td style="padding: 7px 0; font-weight: 600; color: #64748b;">Current Status:</td>
          <td style="padding: 7px 0;">
            <span style="background-color: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}; padding: 3px 12px; border-radius: 5px; font-weight: 800; font-size: 12px; letter-spacing: 0.05em;">
              ${params.newStatus}
            </span>
          </td>
        </tr>
        ${params.notes ? `
        <tr>
          <td style="padding: 7px 0; font-weight: 600; color: #64748b; vertical-align: top;">Audit Log Notes:</td>
          <td style="padding: 7px 0; color: #334155; line-height: 1.6;">${params.notes}</td>
        </tr>` : ''}
      </table>
    </div>
  `;

  return {
    subject,
    text,
    html: getBaseLayout(`Maintenance Status: ${params.newStatus}`, `Ticket #${params.complaintId.slice(0, 8).toUpperCase()}`, content, 'Track Ticket Live', portalUrl),
  };
}
