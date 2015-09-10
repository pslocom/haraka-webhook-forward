# haraka-webhook-forward
A Haraka plugin that enables sending emails being sent to a webhook

## Dependencies
* A Haraka Setup (of course...)
* Add `"request": "2.*"` to your package.json and run `npm install`

## Configure
### plugins
Add `webhook_forward` to your plugins file.  I have added it after `queue/smtp_forward`.

### webhook_forward.ini
**url** - This is the URL you would like the email data to be sent to
**method** - This is the method you would like to use.  Currently POST and PUT are supported
**allow_self_signed** - This disables checking if the certificate of the site you are sending the data to is valid. **ONLY USE THIS WHILE DEBUGGING**
**store_failed_requests** - Allows you to save the json beind sent in the event of a failed request.  Setting this to 0 disables this feature, otherwise set it to the path you'd like the data saved to.
