import PageHeader from './PageHeader'

// 계정 삭제 안내 (/?page=delete-account, 로그인 없이 볼 수 있어요)
// Google Play 정책: 앱을 다시 설치하지 않고도 삭제를 요청할 수 있는 웹 주소. 데이터 보안 양식에 이 주소를 적어요.
const CONTACT = 'rlagjsdud3@hansung.ac.kr'

export default function DeleteAccountInfo() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <PageHeader title="Overlap 계정 삭제" sub="개발자: 김헌영 · Overlap(앱·웹)" />
      <article className="sheet text-[14px] leading-relaxed text-ink [&_li]:mt-1 [&_ol]:m-0 [&_ol]:pl-5 [&_ul]:m-0 [&_ul]:pl-5">
        <h2 className="m-0 mb-2 text-[17px] font-bold">바로 삭제하기</h2>
        <ol>
          <li><b>앱</b>: 홈 오른쪽 위 내 아바타 → 설정 → 맨 아래 <b>회원 탈퇴</b> → ‘탈퇴’ 입력 → 탈퇴하기</li>
          <li><b>웹</b>: <a href="/" className="text-accent underline">overlap-liard.vercel.app</a>에 로그인 → 설정 → <b>회원 탈퇴</b> → ‘탈퇴’ 입력 → 탈퇴하기</li>
        </ol>
        <p className="mb-0 mt-2">앱을 지웠어도 웹에서 같은 계정(카카오·Google·이메일)으로 로그인해 바로 삭제할 수 있어요.</p>

        <h2 className="m-0 mb-2 mt-7 text-[17px] font-bold">로그인할 수 없다면</h2>
        <p className="m-0">
          <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('[Overlap] 계정 삭제 요청')}`} className="text-accent underline">{CONTACT}</a>로
          가입한 방법(카카오·Google·이메일·이름+생년월일)과 계정을 알 수 있는 정보(이메일 또는 표시 이름)를 보내 주세요. 본인 확인 뒤 7일 안에 삭제하고 결과를
          알려 드려요.
        </p>

        <h2 className="m-0 mb-2 mt-7 text-[17px] font-bold">삭제되는 정보</h2>
        <ul>
          <li>계정, 프로필(표시 이름·사진), 로그인 연결(카카오·Google)</li>
          <li>입력한 가능한 시간, 출발지, 친구 관계·친구 신청·친구 코드</li>
          <li>알림 기기 정보(웹 푸시·앱 토큰)와 알림 설정</li>
        </ul>
        <p className="mb-0 mt-2">삭제는 바로 이뤄지고 되돌릴 수 없어요.</p>

        <h2 className="m-0 mb-2 mt-7 text-[17px] font-bold">남거나 따로 처리되는 정보</h2>
        <ul>
          <li>내가 만든 약속: 다른 참여자가 있으면 그중 한 명에게 관리 권한이 넘어가고, 혼자인 약속은 함께 삭제돼요.</li>
          <li>보내 주신 의견: 계정과의 연결을 끊어 익명으로 남아요. 삭제를 원하면 이메일로 요청해 주세요.</li>
          <li>접속 기록: 위탁 업체 서버에서 정해진 기간(최대 7일) 뒤 자동 삭제돼요.</li>
        </ul>
        <p className="mb-0 mt-4 text-[13px] text-ink2">자세한 내용은 <a href="/?page=privacy" className="text-accent underline">개인정보처리방침</a>을 확인해 주세요.</p>
      </article>
    </div>
  )
}
