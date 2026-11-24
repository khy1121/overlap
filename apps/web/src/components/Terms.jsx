import PageHeader from './PageHeader'

// 이용약관 (/?page=terms, 로그인 없이 볼 수 있어요)
// 내용이 바뀌면 EFFECTIVE 날짜를 고치고, 시행 7일 전부터 서비스 안에서 알려 주세요. (초안 — 운영자가 최종 확인)
const EFFECTIVE = '2026년 12월 1일'
const CONTACT = 'rlagjsdud3@hansung.ac.kr'

const H = ({ children }) => <h2 className="m-0 mb-2 mt-7 text-[17px] font-bold">{children}</h2>

export default function Terms() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <PageHeader title="이용약관" sub={`시행일: ${EFFECTIVE}`} />
      <article className="sheet text-[14px] leading-relaxed text-ink [&_li]:mt-1 [&_ol]:m-0 [&_ol]:pl-5 [&_ul]:m-0 [&_ul]:pl-5">
        <H>제1조 (목적)</H>
        <p className="m-0">이 약관은 김헌영(이하 ‘운영자’)이 제공하는 Overlap 앱과 웹(이하 ‘서비스’)을 이용하는 데 필요한 운영자와 이용자의 권리·의무를 정해요.</p>

        <H>제2조 (서비스 내용)</H>
        <ul>
          <li>약속 만들기와 초대, 가능한 시간 입력, 함께 되는 시간 추천, 만날 장소 정하기, 친구 맺기, 알림 등 일정 조율 기능을 무료로 제공해요.</li>
          <li>운영자는 서비스를 더 낫게 하려고 기능을 바꾸거나 추가할 수 있으며, 중요한 변경은 미리 알려 드려요.</li>
        </ul>

        <H>제3조 (가입과 계정)</H>
        <ul>
          <li>만 14세 이상만 가입할 수 있어요. 카카오·Google·이메일로 가입하며, 가입하면 이 약관과 개인정보처리방침에 동의한 것으로 봐요.</li>
          <li>계정과 비밀번호는 이용자가 관리하고, 다른 사람에게 빌려주거나 넘길 수 없어요.</li>
          <li>이용자는 언제든 설정 → 회원 탈퇴로 탈퇴할 수 있어요.</li>
        </ul>

        <H>제4조 (이용자가 올리는 내용)</H>
        <ul>
          <li>약속 이름, 표시 이름, 입력한 시간 등 이용자가 올린 내용(이하 ‘게시물’)의 권리와 책임은 이용자에게 있어요.</li>
          <li>게시물은 같은 약속의 참여자와 친구에게 보이며, 운영자는 서비스를 제공하는 데 필요한 범위에서만 게시물을 저장·표시해요.</li>
        </ul>

        <H>제5조 (금지 행위)</H>
        <p className="m-0">다음 행위를 하면 안 돼요.</p>
        <ul>
          <li>다른 사람을 사칭하거나 다른 사람의 계정을 쓰는 행위</li>
          <li>욕설·혐오·차별·성적 표현, 괴롭힘, 불법 정보가 담긴 약속 이름·표시 이름을 쓰는 행위</li>
          <li>광고·스팸을 보내거나, 동의 없이 다른 사람을 반복해서 초대·친구 신청하는 행위</li>
          <li>서비스를 해킹하거나, 비정상적인 방법으로 접근·자동 요청을 보내 운영을 방해하는 행위</li>
          <li>법령이나 다른 사람의 권리를 침해하는 행위</li>
        </ul>

        <H>제6조 (신고와 이용 제한)</H>
        <ul>
          <li>부적절한 약속·이용자는 웹의 <b>의견 보내기</b>나 <a href={`mailto:${CONTACT}`} className="text-accent underline">{CONTACT}</a>로 신고할 수 있어요. 운영자는 확인 후 지체 없이 조치해요.</li>
          <li>제5조를 어기면 운영자는 해당 게시물을 지우거나 서비스 이용을 제한·해지할 수 있어요. 가능한 경우 이유를 미리 알려 드려요.</li>
          <li>원하지 않는 친구는 친구 목록에서 끊을 수 있고, 원하지 않는 약속에서는 나올 수 있어요.</li>
        </ul>

        <H>제7조 (서비스 중단)</H>
        <p className="m-0">시스템 점검, 위탁 업체(Supabase·Vercel·Expo·카카오·Google 등)의 장애, 천재지변 등으로 서비스가 잠시 멈출 수 있어요. 서비스를 끝낼 때는 30일 전에 알려 드려요.</p>

        <H>제8조 (책임의 제한)</H>
        <ul>
          <li>서비스는 무료로 제공되며, 추천한 시간·장소는 참고용이에요. 실제 약속 진행에 대한 판단과 책임은 이용자에게 있어요.</li>
          <li>운영자는 고의나 중대한 과실이 없는 한, 이용자 사이의 분쟁이나 이용자가 올린 게시물로 생긴 손해를 책임지지 않아요.</li>
        </ul>

        <H>제9조 (약관 변경과 문의)</H>
        <ul>
          <li>약관을 바꾸면 시행 7일 전(이용자에게 불리하면 30일 전)부터 서비스 안에서 알려 드려요.</li>
          <li>문의: <a href={`mailto:${CONTACT}`} className="text-accent underline">{CONTACT}</a></li>
          <li>이 약관은 대한민국 법을 따르며, 분쟁은 민사소송법에 따른 관할 법원에서 해결해요.</li>
        </ul>
        <p className="mb-0 mt-4 text-[13px] text-ink2">이 약관은 {EFFECTIVE}부터 적용돼요. · <a href="/?page=privacy" className="text-accent underline">개인정보처리방침</a> · <a href="/?page=delete-account" className="text-accent underline">계정 삭제 안내</a></p>
      </article>
    </div>
  )
}
