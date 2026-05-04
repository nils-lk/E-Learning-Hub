import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ExternalLink, Heart } from 'lucide-react';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-nilsBlue-900 dark:bg-gray-950 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-nilsGold" />
              </div>
              <div>
                <p className="font-bold text-white leading-none">NILS</p>
                <p className="text-[10px] text-gray-400 leading-none">E-Learning Hub</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Official online learning platform of the National Institute of Labour Studies, Sri Lanka.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-nilsGold transition-colors">Browse Courses</Link></li>
              <li><Link to="/login" className="hover:text-nilsGold transition-colors">Student Login</Link></li>
              <li>
                <a href="https://www.nils.gov.lk" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-nilsGold transition-colors">
                  NILS Official Website <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Contact</h3>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>National Institute of Labour Studies</li>
              <li>Sri Lanka</li>
              <li className="pt-2">
                <a href="mailto:info@nils.gov.lk" className="hover:text-nilsGold transition-colors">info@nils.gov.lk</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {year} National Institute of Labour Studies. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Developed with <Heart className="w-3 h-3 text-red-400 fill-red-400" /> by&nbsp;
            <a href="https://lakshan.vercel.app/" target="_blank" rel="noopener noreferrer"
              className="text-nilsGold hover:underline">V.P.R.L. Vidanapathirana</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
