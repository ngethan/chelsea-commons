import { createFileRoute } from "@tanstack/react-router";
import { Items, LegalPage, Section } from "../components/LegalPage";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/privacy")({
	head: () => {
		const seo = buildSeoTags({
			title: "Privacy Policy - Chelsea Commons",
			description:
				"What Chelsea Commons collects, why, who sees it, and how to have it removed.",
			path: "/privacy",
		});
		return { meta: seo.meta, links: seo.links };
	},
	component: Privacy,
});

const EFFECTIVE = "September 14, 2026";
const CONTACT = "hey@chelseacommons.co";

function Privacy() {
	return (
		<LegalPage title="Privacy Policy" effective={EFFECTIVE}>
			<p>
				Chelsea Commons is a community of builders, operators and founders in
				New York. This page says what we collect when you use our website, come
				to our events, or are in touch with us, what we do with it, and how to
				have it removed. Questions go to{" "}
				<a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
			</p>

			<Section title="What we collect">
				<p>
					<strong>When you RSVP or write to us.</strong> Your name, your email
					address, and anything else you put in the form or the message, such as
					where you work.
				</p>
				<p>
					<strong>When we meet you.</strong> We keep a private list of the
					people in and around the community: name, email, role and company, how
					we know each other, and notes on conversations we have had. It is the
					same information a person would keep in an address book, and it is
					only visible to the small team that runs Chelsea Commons.
				</p>
				<p>
					<strong>When you open a link we sent you.</strong> Updates we send by
					email sometimes carry a link that is unique to you. Opening it records
					the time, your browser's user agent, and your IP address, so we know
					the update reached you. Nothing is recorded if you do not open it.
				</p>
				<p>
					<strong>When you visit the site.</strong> Our hosting provider
					collects aggregate analytics such as page views and rough location. We
					do not use advertising cookies or trackers.
				</p>
				<p>
					<strong>At events.</strong> We take photographs and may publish them
					on this site or our social accounts. If you would like a photo of you
					taken down, email us and we will remove it.
				</p>
			</Section>

			<Section title="Google account data">
				<p>
					Members of the team that runs Chelsea Commons sign in to our private
					admin tools with Google. Signing in gives us their name, email address
					and profile picture, and nothing more.
				</p>
				<p>
					A team member can also choose to connect their Gmail account. We ask
					for read-only access and use it for one thing: to record when that
					team member has been in correspondence with somebody already on our
					contact list, so the list stays current. To do that we read message
					headers (who a message was from and to, when it was sent, and its
					subject) and keep those details only for messages that involve a known
					contact. We do not store message bodies or attachments. Messages that
					do not involve a known contact are not kept.
				</p>
				<p>
					We do not use Google account data for advertising, do not sell it, and
					do not use it to train machine learning or artificial intelligence
					models. No person at Chelsea Commons reads a team member's mail
					through this connection; the only exceptions would be with that team
					member's consent, to investigate a security problem or abuse, or where
					the law requires it.
				</p>
				<p>
					Chelsea Commons' use and transfer to any other app of information
					received from Google APIs will adhere to the{" "}
					<a
						href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
						target="_blank"
						rel="noopener noreferrer"
					>
						Google API Services User Data Policy
					</a>
					, including the Limited Use requirements.
				</p>
				<p>
					A team member can disconnect Gmail at any time from our settings page,
					which revokes our access with Google and deletes the stored
					credentials, or from their{" "}
					<a
						href="https://myaccount.google.com/permissions"
						target="_blank"
						rel="noopener noreferrer"
					>
						Google account permissions
					</a>
					. Records made from their mailbox are deleted when they disconnect or
					on request.
				</p>
			</Section>

			<Section title="How we use it">
				<Items>
					<li>To run events: guest lists, reminders, and follow-ups.</li>
					<li>
						To stay in touch with the people we know and remember what we talked
						about.
					</li>
					<li>To send updates, and to know whether they arrived.</li>
					<li>To understand which pages of the site are read.</li>
				</Items>
				<p>We do not sell personal information and we do not run ads.</p>
			</Section>

			<Section title="Who can see it">
				<p>
					The team that runs Chelsea Commons, and the companies that provide our
					infrastructure: the provider that hosts this site, the provider that
					hosts our database, and the model providers behind the search and
					assistant features of our private tools, which process contact notes
					we have written ourselves. Each handles data only on our instructions.
					Google account data is never sent to a model provider.
				</p>
				<p>
					We would disclose information if the law required it, or to protect
					the safety of our community. If Chelsea Commons were ever to become
					part of another organization, this list would go with it under the
					same terms.
				</p>
			</Section>

			<Section title="How long we keep it">
				<p>
					Contact details and notes are kept for as long as we are in touch.
					Link opens are kept with the update they belong to. Gmail credentials
					are kept until the team member disconnects. Anything can be deleted on
					request.
				</p>
			</Section>

			<Section title="Security">
				<p>
					Everything is served over HTTPS and stored with providers that encrypt
					data at rest. Access to our private tools is by invitation only, and
					every member of the team signs in with their own account. Google
					credentials are stored in our database and are never written into
					email, chat, or logs.
				</p>
			</Section>

			<Section title="Your choices">
				<p>
					Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> to ask what we hold
					about you, to correct it, or to have it deleted. We will answer within
					thirty days. You can stop receiving updates by replying to one and
					saying so.
				</p>
			</Section>

			<Section title="Children">
				<p>
					Our events and site are for adults. We do not knowingly collect
					information from anybody under eighteen.
				</p>
			</Section>

			<Section title="Changes">
				<p>
					If this policy changes, the date at the top changes with it. A change
					that affects Google account data will be announced to the team members
					it concerns before it takes effect.
				</p>
			</Section>
		</LegalPage>
	);
}
