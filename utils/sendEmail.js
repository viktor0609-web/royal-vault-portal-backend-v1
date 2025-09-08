import sgMail from "@sendgrid/mail";



/**
 * Send email via SendGrid
 * 
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of email
 */
const sendEmail = async (to, subject, html) => {
  try {

    const msg = {
      to,
      templateId: process.env.TEMPLATE_ID,
      from: process.env.SENDGRID_FROM_EMAIL, // must be verified sender
      dynamic_template_data: {
        subject,
        html,
      }
    };

    console.log("Sending email via SendGrid:", msg);
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const response = await sgMail.send(msg);

    console.log("Email sent via SendGrid:", response[0].statusCode);
  } catch (error) {
    console.error("Email sending failed (SendGrid):", error.response?.body || error);
  }
};
 
export default sendEmail;
