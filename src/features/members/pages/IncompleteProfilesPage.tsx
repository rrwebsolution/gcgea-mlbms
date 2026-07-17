import MembersPage from "./MembersPage"

export default function IncompleteProfilesPage() {
  return (
    <MembersPage
      incompleteOnly
      title="Incomplete Member Profiles"
      description="Members with missing contact details, beneficiaries, or documents."
    />
  )
}
