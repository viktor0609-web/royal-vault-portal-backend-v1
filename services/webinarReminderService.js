import cron from 'node-cron';
import Webinar from '../models/Webinar.js';
import sendEmail from '../utils/sendEmail.js';

/**
 * Send reminder emails to all registered attendees for a webinar
 */
export const sendWebinarReminder = async (webinar) => {
  try {
    // Skip if reminder already sent
    if (webinar.reminderEmailSent) {
      console.log(`Reminder already sent for webinar ${webinar._id} (${webinar.name})`);
      return;
    }

    // Populate attendees with user details
    await webinar.populate({
      path: 'attendees.user',
      select: 'firstName lastName email'
    });

    // Check if webinar has any attendees
    if (!webinar.attendees || webinar.attendees.length === 0) {
      console.log(`No attendees found for webinar ${webinar._id} (${webinar.name})`);
      return;
    }

    // Format date and time in EST timezone
    const datePart = webinar.date.toLocaleDateString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timePart = webinar.date.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const userUrl = `${process.env.CLIENT_URL}/royal-tv/${webinar.slug}/user?is_user=true`;
    const templateId = process.env.WEBINAR_REMINDER_TEMPLATE_ID;

    if (!templateId) {
      console.error('WEBINAR_REMINDER_TEMPLATE_ID is not configured in environment variables');
      return;
    }

    // Send email to each attendee
    const emailPromises = webinar.attendees.map(async (attendee) => {
      const user = attendee.user;
      
      // Skip if user is not populated or doesn't have email
      if (!user || !user.email) {
        console.warn(`Skipping attendee without email for webinar ${webinar._id}`);
        return;
      }

      const data = {
        firstName: user.firstName,
        lastName: user.lastName,
        link: userUrl,
        subject: "Royal Vault Portal - Webinar Reminder",
        date: datePart,
        time: timePart + " EST",
        webinarName: webinar.line1 || webinar.name,
        description: webinar.line1 || webinar.name,
      };

      try {
        await sendEmail(user.email, data, templateId);
        console.log(`✓ Reminder email sent to ${user.email} for webinar: ${webinar.name}`);
      } catch (error) {
        console.error(`✗ Failed to send reminder to ${user.email} for webinar ${webinar.name}:`, error.message);
      }
    });

    await Promise.all(emailPromises);
    
    // Mark reminder as sent in database
    webinar.reminderEmailSent = true;
    webinar.reminderEmailSentAt = new Date();
    await webinar.save();
    
    console.log(`✓ Reminder emails processed for webinar: ${webinar.name} (${webinar.attendees.length} attendees)`);
  } catch (error) {
    console.error(`Error sending webinar reminders for ${webinar._id}:`, error);
  }
};

/**
 * Check for webinars that need reminders sent (15 minutes before start time)
 */
export const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    
    // Find webinars that start within a 2-minute window (14-16 minutes from now)
    // This accounts for cron running every minute and ensures we catch all webinars
    const startTime = new Date(reminderTime.getTime() - 60 * 1000); // 14 minutes from now
    const endTime = new Date(reminderTime.getTime() + 60 * 1000);   // 16 minutes from now

    // Query for webinars that:
    // 1. Have status "Scheduled" 
    // 2. Have attendees
    // 3. Haven't had reminder sent yet
    // 4. Start between startTime and endTime (approximately 15 minutes from now)
    const webinars = await Webinar.find({
      status: 'Scheduled',
      date: {
        $gte: startTime,
        $lte: endTime
      },
      reminderEmailSent: false,
      'attendees.0': { $exists: true } // Has at least one attendee
    }).populate({
      path: 'attendees.user',
      select: 'firstName lastName email'
    });

    if (webinars.length === 0) {
      return; // Silently return if no webinars need reminders
    }

    console.log(`\n[Webinar Reminder] Found ${webinars.length} webinar(s) needing reminders at ${now.toISOString()}`);

    // Send reminders for each webinar
    for (const webinar of webinars) {
      await sendWebinarReminder(webinar);
    }
  } catch (error) {
    console.error('[Webinar Reminder] Error checking webinar reminders:', error);
  }
};

/**
 * Initialize the cron job to check for reminders every minute
 */
export const startWebinarReminderCron = () => {
  // Run every minute: '*/1 * * * *'
  // Cron format: minute hour day month weekday
  cron.schedule('*/1 * * * *', async () => {
    await checkAndSendReminders();
  });

  console.log('✓ Webinar reminder cron job started - checking every minute for webinars 15 minutes before start time');
};
