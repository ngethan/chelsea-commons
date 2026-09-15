import { Link, createFileRoute } from "@tanstack/react-router";
import { Items, LegalPage, Section } from "../components/LegalPage";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/terms")({
	head: () => {
		const seo = buildSeoTags({
			title: "Terms of Service - Chelsea Commons",
			description: "The terms for using the Chelsea Commons website and tools.",
			path: "/terms",
		});
		return { meta: seo.meta, links: seo.links };
	},
	component: Terms,
});

const EFFECTIVE = "September 14, 2026";
const CONTACT = "hey@chelseacommons.co";

function Terms() {
	return (
		<LegalPage title="Terms of Service" effective={EFFECTIVE}>
			<p>
				These are the terms for using the Chelsea Commons website, coming to our
				events, and, for members of our team, using our private tools. By using
				the site you agree to them. If you have a question, write to{" "}
				<a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
			</p>

			<Section title="The site">
				<p>
					The site describes the community, lists events, and lets you RSVP or
					get in touch. It is provided as it is. We try to keep it accurate and
					available, but we do not promise that it will be either at any given
					moment.
				</p>
			</Section>

			<Section title="Events">
				<p>
					An RSVP is a request, not a guarantee of a place. Events may be
					changed, moved, or cancelled. We may photograph events and publish the
					photographs; if you would like one taken down, email us. Be a good
					guest: we can ask anybody to leave and decline future RSVPs from
					anybody who is not.
				</p>
			</Section>

			<Section title="Acceptable use">
				<Items>
					<li>Do not use the site to send spam or to scrape it.</li>
					<li>
						Do not try to get into parts of the site that are not yours, or to
						interfere with how it runs.
					</li>
					<li>Do not use it for anything unlawful.</li>
				</Items>
			</Section>

			<Section title="Team accounts">
				<p>
					Our private tools are open by invitation to the people who run Chelsea
					Commons. If you have an account, you are responsible for what is done
					with it, and you agree to use what it holds only for the community's
					work. If you connect a Google account, you confirm that it is yours or
					that you are authorized to connect it. We can close an account at any
					time, and you can leave at any time by asking.
				</p>
			</Section>

			<Section title="Content">
				<p>
					The words, photographs and design on this site belong to Chelsea
					Commons or to the people who let us use them. You may share links to
					it freely. Do not republish its content without asking. Anything you
					send us, such as an RSVP or a message, stays yours; you give us
					permission to use it to run the community.
				</p>
			</Section>

			<Section title="Privacy">
				<p>
					What we collect and how we use it is set out in our{" "}
					<Link to="/privacy">privacy policy</Link>, which is part of these
					terms.
				</p>
			</Section>

			<Section title="Liability">
				<p>
					To the extent the law allows, Chelsea Commons and the people who run
					it are not liable for indirect or consequential loss arising from the
					site or from an event, and our total liability to you is limited to
					whatever you paid us, which is usually nothing. Nothing here limits
					liability that cannot be limited by law.
				</p>
			</Section>

			<Section title="Governing law">
				<p>
					These terms are governed by the laws of the State of New York, and any
					dispute will be heard in the courts of New York County.
				</p>
			</Section>

			<Section title="Changes">
				<p>
					If these terms change, the date at the top changes with it. Continuing
					to use the site after a change means you accept it.
				</p>
			</Section>
		</LegalPage>
	);
}
