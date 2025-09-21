import sgMail from "@sendgrid/mail";


const sendEmail = async (to, firstName, url, templateId) => {
  try {

    const msg = {
      to,
      templateId:templateId,
      from: process.env.SENDGRID_FROM_EMAIL, // must be verified sender
      dynamic_template_data: {
        firstName,
        url,
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
